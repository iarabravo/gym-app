import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.ts';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('PROJECT_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
);

const PLAN_CATALOG: Record<string, { id: string; name: string; price: number }> = {
  basic: { id: 'basic', name: 'Basico', price: 100 },
  premium: { id: 'premium', name: 'Premium', price: 49 },
  vip: { id: 'vip', name: 'VIP', price: 79 },
};

function getPlanConfig(planId: string) {
  return PLAN_CATALOG[planId];
}

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string) {
  const sanitized = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binaryString = atob(sanitized);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function signJwtWithServiceAccount(payload: Record<string, unknown>, privateKeyPem: string) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function activateMembershipForUser(userId: string, plan: string, paymentMethod: string) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const membership = {
    userId,
    plan,
    status: 'active',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    paymentMethod,
    autoRenew: true
  };

  await kv.set(`membership:${userId}`, membership);

  const profile = await kv.get(`user:${userId}`);
  if (profile) {
    profile.membershipStatus = 'active';
    await kv.set(`user:${userId}`, profile);
  }

  return membership;
}

async function registerCompletedPayment({
  userId,
  amount,
  concept,
  paymentMethod,
  externalReference,
  providerPaymentId,
  providerStatus,
}: {
  userId: string;
  amount: number;
  concept: string;
  paymentMethod: string;
  externalReference?: string;
  providerPaymentId?: string;
  providerStatus?: string;
}) {
  const paymentId = providerPaymentId
    ? `${userId}:${providerPaymentId}`
    : `${userId}:${Date.now()}`;

  const payment = {
    id: paymentId,
    userId,
    amount,
    concept,
    paymentMethod,
    externalReference,
    providerPaymentId,
    providerStatus,
    status: 'completed',
    date: new Date().toISOString()
  };

  await kv.set(`payment:${payment.id}`, payment);
  return payment;
}

// ============= AUTH ROUTES =============

// Sign up route
app.post('/make-server-5dacf80d/signup', async (c) => {
  try {
    const { email, password, name, dni } = await c.req.json();
    
    console.log('========== SIGNUP REQUEST START ==========');
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('DNI:', dni);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, dni },
      email_confirm: true // Automatically confirm since email server hasn't been configured
    });

    if (error) {
      console.log(`Sign up error creating auth user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    console.log('Auth user created successfully. User ID:', data.user.id);

    // Split name into nombre and apellido
    const nameParts = name.trim().split(' ');
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';

    // Insert user into PostgreSQL users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        uuid: data.user.id,
        nombre: nombre,
        apellido: apellido,
        email: email,
        dni: dni,
        telefono: '',
        nivel: 'principiante',
        objetivo: ''
      })
      .select()
      .single();

    if (dbError) {
      console.log('Error inserting user into database:', dbError.message);
      // Delete auth user if database insert fails
      await supabase.auth.admin.deleteUser(data.user.id);
      return c.json({ error: 'Error creating user profile in database' }, 500);
    }

    console.log('User profile saved to database successfully:', userData);

    // Also save a minimal profile in KV store for backward compatibility
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      dni,
      createdAt: new Date().toISOString(),
      membershipStatus: 'inactive',
      progress: {
        workoutsCompleted: 0,
        totalMinutes: 0,
        streak: 0
      }
    });

    // Initialize sample classes on first signup (idempotent check)
    const existingClasses = await kv.get('class:1');
    if (!existingClasses) {
      const sampleClasses = [
        {
          id: 'class:1',
          name: 'Yoga Matutino',
          instructor: 'María González',
          schedule: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          capacity: 20,
          type: 'yoga',
          duration: 60,
          enrolled: 12,
          enrolledUsers: []
        },
        {
          id: 'class:2',
          name: 'Spinning Intenso',
          instructor: 'Carlos Ruiz',
          schedule: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
          capacity: 15,
          type: 'spinning',
          duration: 45,
          enrolled: 15,
          enrolledUsers: []
        },
        {
          id: 'class:3',
          name: 'CrossFit',
          instructor: 'Ana Martínez',
          schedule: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          capacity: 12,
          type: 'crossfit',
          duration: 50,
          enrolled: 8,
          enrolledUsers: []
        },
        {
          id: 'class:4',
          name: 'Pilates',
          instructor: 'Laura Sánchez',
          schedule: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
          capacity: 18,
          type: 'pilates',
          duration: 55,
          enrolled: 10,
          enrolledUsers: []
        }
      ];

      for (const classData of sampleClasses) {
        await kv.set(classData.id, classData);
      }
    }

    console.log('========== SIGNUP COMPLETED SUCCESSFULLY ==========');
    return c.json({ user: data.user, profile: userData });
  } catch (error) {
    console.log(`Sign up error during main signup flow: ${error}`);
    return c.json({ error: 'Error creating user' }, 500);
  }
});

// Get user profile
app.get('/make-server-5dacf80d/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('Profile GET request - Token present:', !!accessToken);
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    console.log('Profile GET - User ID:', user?.id, 'Error:', error?.message);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user from PostgreSQL users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', user.id)
      .single();

    if (dbError) {
      console.log('Profile GET - Database error:', dbError.message);
      // Fallback to KV store for backward compatibility
      const kvProfile = await kv.get(`user:${user.id}`);
      console.log('Profile GET - Retrieved from KV (fallback):', kvProfile);
      return c.json({ profile: kvProfile });
    }

    console.log('Profile GET - Retrieved from database:', userData);

    // Combine database data with KV data for progress and membership
    const kvProfile = await kv.get(`user:${user.id}`);
    const combinedProfile = {
      id: userData.uuid,
      email: userData.email,
      name: `${userData.nombre} ${userData.apellido}`.trim(),
      firstName: userData.nombre,
      lastName: userData.apellido,
      dni: userData.dni,
      phone: userData.telefono,
      level: userData.nivel,
      objetivo: userData.objetivo,
      avatarUrl: userData.avatar_url,
      createdAt: userData.created_at,
      // Include KV data for backward compatibility
      membershipStatus: kvProfile?.membershipStatus || 'inactive',
      progress: kvProfile?.progress || {
        workoutsCompleted: 0,
        totalMinutes: 0,
        streak: 0
      }
    };
    
    return c.json({ profile: combinedProfile });
  } catch (error) {
    console.log(`Profile fetch error: ${error}`);
    return c.json({ error: 'Error fetching profile' }, 500);
  }
});

// DEBUG: Get all users (temporary for debugging)
app.get('/make-server-5dacf80d/debug/users', async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    console.log('DEBUG: All users in KV store:', allUsers);
    return c.json({ users: allUsers, count: allUsers.length });
  } catch (error) {
    console.log(`Debug users fetch error: ${error}`);
    return c.json({ error: 'Error fetching users' }, 500);
  }
});

// Update user profile
app.put('/make-server-5dacf80d/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('Profile update request received');
    console.log('Access token present:', !!accessToken);
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    console.log('User auth result:', { userId: user?.id, error: error?.message });

    if (!user?.id || error) {
      console.log('Authorization failed:', error?.message || 'No user ID');
      return c.json({ error: 'Unauthorized', details: error?.message }, 401);
    }

    const body = await c.req.json();
    console.log('Update data received for user:', user.id, body);
    
    // Split name into nombre and apellido if provided
    let nombre, apellido;
    if (body.name) {
      const nameParts = body.name.trim().split(' ');
      nombre = nameParts[0] || '';
      apellido = nameParts.slice(1).join(' ') || '';
    }

    // Update PostgreSQL users table
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (apellido !== undefined) updateData.apellido = apellido;
    if (body.phone) updateData.telefono = body.phone;
    if (body.dni) updateData.dni = body.dni;
    if (body.level) updateData.nivel = body.level;
    if (body.objetivo) updateData.objetivo = body.objetivo;
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;

    if (Object.keys(updateData).length > 0) {
      const { data: updatedData, error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('uuid', user.id)
        .select()
        .single();

      if (dbError) {
        console.log('Error updating database:', dbError.message);
        return c.json({ error: 'Error updating profile in database' }, 500);
      }

      console.log('Database updated successfully:', updatedData);
    }

    // Also update KV store for backward compatibility
    const kvProfile = await kv.get(`user:${user.id}`);
    if (kvProfile) {
      const updatedProfile = {
        ...kvProfile,
        name: body.name || kvProfile.name,
        phone: body.phone || kvProfile.phone,
        dni: body.dni || kvProfile.dni,
        birthdate: body.birthdate || kvProfile.birthdate,
        address: body.address || kvProfile.address,
        emergencyContact: body.emergencyContact || kvProfile.emergencyContact,
        emergencyPhone: body.emergencyPhone || kvProfile.emergencyPhone,
        updatedAt: new Date().toISOString()
      };

      await kv.set(`user:${user.id}`, updatedProfile);
    }
    
    // Also update Supabase Auth user metadata so name is available everywhere
    if (body.name) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { 
          ...user.user_metadata,
          name: body.name,
          dni: body.dni || user.user_metadata?.dni
        }
      });
    }
    
    // Get updated profile from database
    const { data: finalProfile } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', user.id)
      .single();

    const combinedProfile = {
      id: finalProfile.uuid,
      email: finalProfile.email,
      name: `${finalProfile.nombre} ${finalProfile.apellido}`.trim(),
      firstName: finalProfile.nombre,
      lastName: finalProfile.apellido,
      dni: finalProfile.dni,
      phone: finalProfile.telefono,
      level: finalProfile.nivel,
      objetivo: finalProfile.objetivo,
      avatarUrl: finalProfile.avatar_url,
      membershipStatus: kvProfile?.membershipStatus || 'inactive',
      progress: kvProfile?.progress || { workoutsCompleted: 0, totalMinutes: 0, streak: 0 }
    };
    
    console.log('Profile updated successfully for user:', user.id);
    return c.json({ profile: combinedProfile });
  } catch (error) {
    console.log(`Profile update error: ${error}`);
    return c.json({ error: 'Error updating profile', details: String(error) }, 500);
  }
});

// ============= MEMBERSHIP ROUTES =============

// Get membership
app.get('/make-server-5dacf80d/membership', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const membership = await kv.get(`membership:${user.id}`);
    return c.json({ membership: membership || null });
  } catch (error) {
    console.log(`Membership fetch error: ${error}`);
    return c.json({ error: 'Error fetching membership' }, 500);
  }
});

// Subscribe to membership
app.post('/make-server-5dacf80d/membership/subscribe', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { plan, paymentMethod } = await c.req.json();
    const membership = await activateMembershipForUser(user.id, plan, paymentMethod);

    return c.json({ membership });
  } catch (error) {
    console.log(`Membership subscription error: ${error}`);
    return c.json({ error: 'Error subscribing to membership' }, 500);
  }
});

// ============= PAYMENT ROUTES =============

// Get payment history
app.get('/make-server-5dacf80d/payments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const payments = await kv.getByPrefix(`payment:${user.id}:`);
    return c.json({ payments: payments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) });
  } catch (error) {
    console.log(`Payments fetch error: ${error}`);
    return c.json({ error: 'Error fetching payments' }, 500);
  }
});

// Process payment
app.post('/make-server-5dacf80d/payments/process', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, concept, paymentMethod } = await c.req.json();
    const payment = await registerCompletedPayment({
      userId: user.id,
      amount,
      concept,
      paymentMethod,
    });

    return c.json({ payment });
  } catch (error) {
    console.log(`Payment processing error: ${error}`);
    return c.json({ error: 'Error processing payment' }, 500);
  }
});

app.post('/make-server-5dacf80d/payments/mercadopago/preference', async (c) => {
  try {
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!mpAccessToken) {
      return c.json({ error: 'Falta configurar MP_ACCESS_TOKEN en Supabase' }, 500);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { planId } = await c.req.json();
    const plan = getPlanConfig(planId);

    if (!plan) {
      return c.json({ error: 'Plan invalido' }, 400);
    }

    const profile = await kv.get(`user:${user.id}`);
    const externalReference = `${user.id}:${plan.id}:${Date.now()}`;
    const notificationUrl = Deno.env.get('MP_WEBHOOK_URL');
    const appReturnUrl = Deno.env.get('APP_RETURN_URL');

    const preferencePayload: Record<string, unknown> = {
      items: [
        {
          id: plan.id,
          title: `Membresia ${plan.name}`,
          description: `Plan ${plan.name} mensual`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: plan.price,
        }
      ],
      external_reference: externalReference,
      statement_descriptor: 'GYMAPP',
      payer: {
        email: user.email,
        name: profile?.name,
      },
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_name: plan.name,
      }
    };

    if (notificationUrl) {
      preferencePayload.notification_url = notificationUrl;
    }

    if (appReturnUrl) {
      preferencePayload.back_urls = {
        success: appReturnUrl,
        pending: appReturnUrl,
        failure: appReturnUrl,
      };
      preferencePayload.auto_return = 'approved';
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.log('Mercado Pago preference error:', responseData);
      return c.json({ error: 'No se pudo crear el link de pago' }, 500);
    }

    await kv.set(`payment_intent:${externalReference}`, {
      externalReference,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      paymentMethod: 'mercado_pago',
      preferenceId: responseData.id,
      checkoutUrl: responseData.init_point,
      sandboxCheckoutUrl: responseData.sandbox_init_point,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return c.json({
      externalReference,
      preferenceId: responseData.id,
      checkoutUrl: responseData.init_point,
      sandboxCheckoutUrl: responseData.sandbox_init_point,
      plan,
    });
  } catch (error) {
    console.log(`Mercado Pago preference error: ${error}`);
    return c.json({ error: 'Error creando el pago con Mercado Pago' }, 500);
  }
});

app.post('/make-server-5dacf80d/payments/mercadopago/confirm', async (c) => {
  try {
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!mpAccessToken) {
      return c.json({ error: 'Falta configurar MP_ACCESS_TOKEN en Supabase' }, 500);
    }

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { externalReference } = await c.req.json();
    if (!externalReference) {
      return c.json({ error: 'Falta externalReference' }, 400);
    }

    const paymentIntent = await kv.get(`payment_intent:${externalReference}`);
    if (!paymentIntent || paymentIntent.userId !== user.id) {
      return c.json({ error: 'Pago pendiente no encontrado' }, 404);
    }

    if (paymentIntent.status === 'approved' && paymentIntent.completedPaymentId) {
      const existingMembership = await kv.get(`membership:${user.id}`);
      const existingPayment = await kv.get(`payment:${paymentIntent.completedPaymentId}`);
      return c.json({
        paymentStatus: 'approved',
        membership: existingMembership,
        payment: existingPayment,
        planName: paymentIntent.planName,
      });
    }

    const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
    searchUrl.searchParams.set('external_reference', externalReference);
    searchUrl.searchParams.set('sort', 'date_created');
    searchUrl.searchParams.set('criteria', 'desc');
    searchUrl.searchParams.set('limit', '1');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });
    const responseData = await response.json();

    if (!response.ok) {
      console.log('Mercado Pago confirm error:', responseData);
      return c.json({ error: 'No se pudo validar el pago en Mercado Pago' }, 500);
    }

    const latestPayment = responseData.results?.[0];
    if (!latestPayment) {
      return c.json({ paymentStatus: 'pending', statusDetail: 'not_found' }, 202);
    }

    if (latestPayment.status !== 'approved') {
      await kv.set(`payment_intent:${externalReference}`, {
        ...paymentIntent,
        status: latestPayment.status,
        providerPaymentId: String(latestPayment.id),
        providerStatus: latestPayment.status,
        lastCheckedAt: new Date().toISOString(),
      });

      return c.json({
        paymentStatus: latestPayment.status,
        statusDetail: latestPayment.status_detail,
      }, latestPayment.status === 'rejected' || latestPayment.status === 'cancelled' ? 400 : 202);
    }

    const membership = await activateMembershipForUser(user.id, paymentIntent.planId, 'mercado_pago');
    const payment = await registerCompletedPayment({
      userId: user.id,
      amount: Number(latestPayment.transaction_amount || paymentIntent.amount),
      concept: `Plan ${paymentIntent.planName}`,
      paymentMethod: 'mercado_pago',
      externalReference,
      providerPaymentId: String(latestPayment.id),
      providerStatus: latestPayment.status,
    });

    await kv.set(`payment_intent:${externalReference}`, {
      ...paymentIntent,
      status: 'approved',
      providerPaymentId: String(latestPayment.id),
      providerStatus: latestPayment.status,
      completedPaymentId: payment.id,
      approvedAt: new Date().toISOString(),
    });

    return c.json({
      paymentStatus: 'approved',
      membership,
      payment,
      planName: paymentIntent.planName,
    });
  } catch (error) {
    console.log(`Mercado Pago confirm error: ${error}`);
    return c.json({ error: 'Error confirmando el pago con Mercado Pago' }, 500);
  }
});

// ============= CLASSES ROUTES =============

// Get all classes
app.get('/make-server-5dacf80d/classes', async (c) => {
  try {
    const classes = await kv.getByPrefix('class:');
    return c.json({ classes });
  } catch (error) {
    console.log(`Classes fetch error: ${error}`);
    return c.json({ error: 'Error fetching classes' }, 500);
  }
});

// Create class (admin)
app.post('/make-server-5dacf80d/classes/create', async (c) => {
  try {
    const { name, instructor, schedule, capacity, type, duration } = await c.req.json();

    const classId = `class:${Date.now()}`;
    const newClass = {
      id: classId,
      name,
      instructor,
      schedule,
      capacity,
      type,
      duration,
      enrolled: 0,
      enrolledUsers: []
    };

    await kv.set(classId, newClass);

    return c.json({ class: newClass });
  } catch (error) {
    console.log(`Class creation error: ${error}`);
    return c.json({ error: 'Error creating class' }, 500);
  }
});

// Get user bookings
app.get('/make-server-5dacf80d/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookings = await kv.getByPrefix(`booking:${user.id}:`);
    return c.json({ bookings });
  } catch (error) {
    console.log(`Bookings fetch error: ${error}`);
    return c.json({ error: 'Error fetching bookings' }, 500);
  }
});

// Book a class
app.post('/make-server-5dacf80d/classes/book', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { classId } = await c.req.json();

    const classData = await kv.get(classId);
    if (!classData) {
      return c.json({ error: 'Class not found' }, 404);
    }

    if (classData.enrolled >= classData.capacity) {
      return c.json({ error: 'Class is full' }, 400);
    }

    const booking = {
      id: `booking:${user.id}:${classId}:${Date.now()}`,
      userId: user.id,
      classId,
      className: classData.name,
      schedule: classData.schedule,
      bookedAt: new Date().toISOString(),
      status: 'confirmed'
    };

    await kv.set(booking.id, booking);

    // Update class enrollment
    classData.enrolled += 1;
    classData.enrolledUsers.push(user.id);
    await kv.set(classId, classData);

    return c.json({ booking });
  } catch (error) {
    console.log(`Class booking error: ${error}`);
    return c.json({ error: 'Error booking class' }, 500);
  }
});

// Cancel booking
app.delete('/make-server-5dacf80d/bookings/:bookingId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const booking = await kv.get(bookingId);

    if (!booking || booking.userId !== user.id) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    const classData = await kv.get(booking.classId);
    if (classData) {
      classData.enrolled -= 1;
      classData.enrolledUsers = classData.enrolledUsers.filter(id => id !== user.id);
      await kv.set(booking.classId, classData);
    }

    await kv.del(bookingId);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Booking cancellation error: ${error}`);
    return c.json({ error: 'Error canceling booking' }, 500);
  }
});

// ============= WORKOUT ROUTINES ROUTES =============

// Get all routines
app.get('/make-server-5dacf80d/routines', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const routines = await kv.getByPrefix(`routine:${user.id}:`);
    const recommendedRoutines = await kv.getByPrefix('routine:recommended:');
    
    return c.json({ 
      myRoutines: routines,
      recommended: recommendedRoutines 
    });
  } catch (error) {
    console.log(`Routines fetch error: ${error}`);
    return c.json({ error: 'Error fetching routines' }, 500);
  }
});

// Create routine
app.post('/make-server-5dacf80d/routines/create', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, description, exercises, level, duration } = await c.req.json();

    const routineId = `routine:${user.id}:${Date.now()}`;
    const routine = {
      id: routineId,
      userId: user.id,
      name,
      description,
      exercises,
      level,
      duration,
      createdAt: new Date().toISOString()
    };

    await kv.set(routineId, routine);

    return c.json({ routine });
  } catch (error) {
    console.log(`Routine creation error: ${error}`);
    return c.json({ error: 'Error creating routine' }, 500);
  }
});

// ============= PROGRESS TRACKING ROUTES =============

// Get user progress
app.get('/make-server-5dacf80d/progress', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const workouts = await kv.getByPrefix(`workout:${user.id}:`);
    const profile = await kv.get(`user:${user.id}`);

    return c.json({ 
      workouts: workouts.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      summary: profile?.progress || {}
    });
  } catch (error) {
    console.log(`Progress fetch error: ${error}`);
    return c.json({ error: 'Error fetching progress' }, 500);
  }
});

// Log workout
app.post('/make-server-5dacf80d/progress/log', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { routineName, duration, calories, exercises, heartRate } = await c.req.json();

    const workoutId = `workout:${user.id}:${Date.now()}`;
    const workout = {
      id: workoutId,
      userId: user.id,
      routineName,
      duration,
      calories,
      exercises,
      heartRate,
      date: new Date().toISOString()
    };

    await kv.set(workoutId, workout);

    // Update user progress
    const profile = await kv.get(`user:${user.id}`);
    if (profile) {
      profile.progress.workoutsCompleted += 1;
      profile.progress.totalMinutes += duration;
      await kv.set(`user:${user.id}`, profile);
    }

    return c.json({ workout });
  } catch (error) {
    console.log(`Workout logging error: ${error}`);
    return c.json({ error: 'Error logging workout' }, 500);
  }
});

// ============= GYM ACCESS ROUTES =============

// Generate access QR
app.get('/make-server-5dacf80d/access/qr', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('QR generation error: No access token provided');
      return c.json({ error: 'No authorization token provided' }, 401);
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      console.log(`QR generation error: Auth error - ${error?.message || 'User not found'}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`Fetching membership for user: ${user.id}`);
    const membership = await kv.get(`membership:${user.id}`);
    console.log(`Membership status:`, membership);
    
    if (!membership || membership.status !== 'active') {
      console.log(`QR generation error: No active membership for user ${user.id}`);
      return c.json({ error: 'No active membership' }, 403);
    }

    const accessCode = `GYM-${user.id}-${Date.now()}`;
    console.log(`Successfully generated QR code for user ${user.id}`);
    
    return c.json({ 
      accessCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
    });
  } catch (error) {
    console.log(`QR generation error: ${error.message || error}`);
    return c.json({ error: `Error generating QR code: ${error.message || error}` }, 500);
  }
});

// Log gym entry
app.post('/make-server-5dacf80d/access/entry', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const entry = {
      id: `entry:${user.id}:${Date.now()}`,
      userId: user.id,
      timestamp: new Date().toISOString(),
      method: 'qr' // qr, fingerprint, dni, wallet
    };

    await kv.set(entry.id, entry);

    return c.json({ entry });
  } catch (error) {
    console.log(`Entry logging error: ${error}`);
    return c.json({ error: 'Error logging entry' }, 500);
  }
});

app.get('/make-server-5dacf80d/access/wallet/google', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
    const serviceAccountEmail = Deno.env.get('GOOGLE_WALLET_CLIENT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_WALLET_PRIVATE_KEY');
    const logoUrl = Deno.env.get('GOOGLE_WALLET_LOGO_URL');

    if (!issuerId || !serviceAccountEmail || !privateKey) {
      return c.json({
        error: 'Google Wallet no esta configurado todavia. Faltan GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLIENT_EMAIL y GOOGLE_WALLET_PRIVATE_KEY.',
      }, 501);
    }

    const profile = await kv.get(`user:${user.id}`);
    const membership = await kv.get(`membership:${user.id}`);
    const qrEntry = await kv.getByPrefix(`access_qr:${user.id}:`);
    const latestQr = qrEntry.sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
    const accessCode = latestQr?.accessCode || `GYM-${user.id}-${Date.now()}`;
    const objectSuffix = `gym_access_${user.id.replace(/-/g, '')}`;
    const classSuffix = 'gym_access';
    const classId = `${issuerId}.${classSuffix}`;
    const objectId = `${issuerId}.${objectSuffix}`;

    const walletPayload: Record<string, unknown> = {
      iss: serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [],
      payload: {
        genericClasses: [
          {
            id: classId,
            classTemplateInfo: {
              cardTemplateOverride: {
                cardRowTemplateInfos: [
                  {
                    twoItems: {
                      startItem: {
                        firstValue: {
                          fields: [{ fieldPath: "object.textModulesData['dni']" }]
                        }
                      },
                      endItem: {
                        firstValue: {
                          fields: [{ fieldPath: "object.textModulesData['plan']" }]
                        }
                      }
                    }
                  }
                ]
              }
            },
            issuerName: 'GymApp',
            reviewStatus: 'UNDER_REVIEW',
            hexBackgroundColor: '#1d4ed8',
            logo: logoUrl ? {
              sourceUri: { uri: logoUrl },
              contentDescription: {
                defaultValue: {
                  language: 'es-AR',
                  value: 'Logo GymApp'
                }
              }
            } : undefined,
          }
        ],
        genericObjects: [
          {
            id: objectId,
            classId,
            state: 'ACTIVE',
            cardTitle: {
              defaultValue: {
                language: 'es-AR',
                value: 'Acceso al Gym'
              }
            },
            header: {
              defaultValue: {
                language: 'es-AR',
                value: profile?.name || user.email || 'Usuario'
              }
            },
            subheader: {
              defaultValue: {
                language: 'es-AR',
                value: membership?.plan ? `Plan ${membership.plan}` : 'Miembro GymApp'
              }
            },
            barcode: {
              type: 'QR_CODE',
              value: accessCode,
              alternateText: accessCode,
            },
            textModulesData: [
              {
                id: 'dni',
                header: 'DNI',
                body: profile?.dni || 'Sin DNI cargado',
              },
              {
                id: 'plan',
                header: 'Plan',
                body: membership?.plan || 'Sin membresia activa',
              }
            ]
          }
        ]
      }
    };

    const token = await signJwtWithServiceAccount(walletPayload, privateKey.replace(/\\n/g, '\n'));
    return c.json({
      saveUrl: `https://pay.google.com/gp/v/save/${token}`,
    });
  } catch (error) {
    console.log(`Google Wallet generation error: ${error}`);
    return c.json({ error: 'Error generando el pase para Google Wallet' }, 500);
  }
});

app.get('/make-server-5dacf80d/access/wallet/apple', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const passUrl = Deno.env.get('APPLE_WALLET_PASS_URL');
    if (!passUrl) {
      return c.json({
        error: 'Apple Wallet no esta configurado todavia. Falta APPLE_WALLET_PASS_URL o un servicio que genere el archivo .pkpass firmado.',
      }, 501);
    }

    return c.json({ passUrl });
  } catch (error) {
    console.log(`Apple Wallet generation error: ${error}`);
    return c.json({ error: 'Error generando el pase para Apple Wallet' }, 500);
  }
});

// Get gym occupancy
app.get('/make-server-5dacf80d/gym/occupancy', async (c) => {
  try {
    // Get entries from the last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const allEntries = await kv.getByPrefix('entry:');
    const recentEntries = allEntries.filter(entry => 
      new Date(entry.timestamp) > fourHoursAgo
    );

    const capacity = 100;
    const current = Math.min(recentEntries.length, capacity);
    const percentage = Math.round((current / capacity) * 100);

    return c.json({ 
      current,
      capacity,
      percentage,
      status: percentage > 80 ? 'busy' : percentage > 50 ? 'moderate' : 'quiet'
    });
  } catch (error) {
    console.log(`Occupancy fetch error: ${error}`);
    return c.json({ error: 'Error fetching occupancy' }, 500);
  }
});

// ============= NOTIFICATIONS ROUTES =============

// Get notifications
app.get('/make-server-5dacf80d/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const notifications = await kv.getByPrefix(`notification:${user.id}:`);
    return c.json({ 
      notifications: notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) 
    });
  } catch (error) {
    console.log(`Notifications fetch error: ${error}`);
    return c.json({ error: 'Error fetching notifications' }, 500);
  }
});

// Create notification
app.post('/make-server-5dacf80d/notifications/create', async (c) => {
  try {
    const { userId, title, message, type } = await c.req.json();

    const notificationId = `notification:${userId}:${Date.now()}`;
    const notification = {
      id: notificationId,
      userId,
      title,
      message,
      type, // payment, class, occupancy, recommendation
      read: false,
      createdAt: new Date().toISOString()
    };

    await kv.set(notificationId, notification);

    return c.json({ notification });
  } catch (error) {
    console.log(`Notification creation error: ${error}`);
    return c.json({ error: 'Error creating notification' }, 500);
  }
});

// Mark notification as read
app.patch('/make-server-5dacf80d/notifications/:notificationId/read', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const notificationId = c.req.param('notificationId');
    const notification = await kv.get(notificationId);

    if (!notification || notification.userId !== user.id) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    notification.read = true;
    await kv.set(notificationId, notification);

    return c.json({ notification });
  } catch (error) {
    console.log(`Notification update error: ${error}`);
    return c.json({ error: 'Error updating notification' }, 500);
  }
});

export { app };
