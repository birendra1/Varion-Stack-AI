import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ollama-chat";

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Find admin user
    console.log('\n1. Looking for admin user...');
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    if (!adminUser) {
      console.error('ERROR: Admin user not found! Please create admin user first.');
      process.exit(1);
    }
    console.log(`Found admin user: ${adminUser.username} (${adminUser._id})`);

    // 2. Update admin user to have email if missing
    if (!adminUser.email) {
      console.log('\n2. Adding email to admin user...');
      await db.collection('users').updateOne(
        { _id: adminUser._id },
        {
          $set: {
            email: 'admin@localhost.com',
            isEmailVerified: true,
            preferences: {
              theme: 'system',
              accentColor: '#1976d2',
              defaultModel: null,
              customSystemPrompt: null
            }
          }
        }
      );
      console.log('Admin email updated');
    } else {
      console.log('\n2. Admin user already has email:', adminUser.email);
    }

    // 3. Count anonymous sessions
    console.log('\n3. Counting anonymous sessions...');
    const anonymousCount = await db.collection('chatsessions').countDocuments({
      $or: [{ userId: null }, { userId: { $exists: false } }]
    });
    console.log(`Found ${anonymousCount} anonymous sessions`);

    if (anonymousCount === 0) {
      console.log('No anonymous sessions to migrate!');
    } else {
      // 4. Migrate anonymous sessions to admin
      console.log('\n4. Migrating anonymous sessions to admin user...');
      const result = await db.collection('chatsessions').updateMany(
        { $or: [{ userId: null }, { userId: { $exists: false } }] },
        { $set: { userId: adminUser._id } }
      );
      console.log(`Migrated ${result.modifiedCount} sessions to admin user`);
    }

    // 5. Show summary
    console.log('\n=== Migration Summary ===');
    const totalSessions = await db.collection('chatsessions').countDocuments();
    const adminSessions = await db.collection('chatsessions').countDocuments({ userId: adminUser._id });
    console.log(`Total sessions: ${totalSessions}`);
    console.log(`Admin sessions: ${adminSessions}`);
    console.log('\nMigration complete!');

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
