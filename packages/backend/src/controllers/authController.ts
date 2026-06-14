import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-key-1234567890';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'local-development-refresh-key-0987654321';
const ACCESS_EXPIRE = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Simple in-memory storage for active refresh tokens to handle logout verification
const activeRefreshTokens = new Set<string>();

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRE as any });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRE as any });

    activeRefreshTokens.add(refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  if (!activeRefreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
    
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRE as any }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    activeRefreshTokens.delete(refreshToken);
  }
  res.status(200).json({ message: 'Logged out successfully' });
}
