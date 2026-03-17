import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('PROJECT_URL') ?? '',
  Deno.env.get('SERVICE_ROLE_KEY') ?? ''
);

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
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const membership = {
      userId: user.id,
      plan, // 'basic', 'premium', 'vip'
      status: 'active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      paymentMethod,
      autoRenew: true
    };

    await kv.set(`membership:${user.id}`, membership);

    // Update user profile status
    const profile = await kv.get(`user:${user.id}`);
    if (profile) {
      profile.membershipStatus = 'active';
      await kv.set(`user:${user.id}`, profile);
    }

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

    const payment = {
      id: `${user.id}:${Date.now()}`,
      userId: user.id,
      amount,
      concept,
      paymentMethod,
      status: 'completed',
      date: new Date().toISOString()
    };

    await kv.set(`payment:${payment.id}`, payment);

    return c.json({ payment });
  } catch (error) {
    console.log(`Payment processing error: ${error}`);
    return c.json({ error: 'Error processing payment' }, 500);
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

if (import.meta.main) {
  Deno.serve(app.fetch);
}
