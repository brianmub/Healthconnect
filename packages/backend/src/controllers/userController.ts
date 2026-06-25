import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    res.json(users);
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

export async function createUser(req: Request, res: Response) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required' });
  }

  if (role !== 'ADMIN' && role !== 'STAFF') {
    return res.status(400).json({ error: 'Invalid role. Must be either ADMIN or STAFF' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  if (role !== 'ADMIN' && role !== 'STAFF') {
    return res.status(400).json({ error: 'Invalid role. Must be either ADMIN or STAFF' });
  }

  try {
    // Prevent self-demotion
    if (req.user && req.user.id === id && role !== 'ADMIN') {
      return res.status(400).json({ error: 'You cannot change your own role to prevent losing admin privileges.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function updateUserPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ message: 'User password updated successfully' });
  } catch (err) {
    console.error('updateUserPassword error:', err);
    res.status(500).json({ error: 'Failed to update user password' });
  }
}
