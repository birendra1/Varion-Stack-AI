import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export async function seedAdmin() {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@localhost.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });
    console.log("👤 Default Admin created (admin/admin123)");
  } else if (!adminExists.email) {
    await User.updateOne(
      { username: 'admin' },
      { $set: { email: 'admin@localhost.com', isEmailVerified: true } }
    );
    console.log("👤 Admin email updated");
  }
}
