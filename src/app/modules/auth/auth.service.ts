import bcrypt from "bcryptjs";
import { config } from "../../config";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/AppError";
import { sendEmail } from "../../lib/nodemailer";
import { generatePasswordResetToken, verifyToken } from "../../utils/jwt";
import {
  UserCreateInput,
  UserUpdateInput,
} from "../../generated/prisma/models";
import { buildTokens, safeUser } from "../../utils/authUtils";
import { Role } from "../../generated/prisma/enums";
import { getById } from "../../services/base.service";
import { SafeUser } from "../user/user.service";
import { User } from "../../generated/prisma/client";

export const registerUser = async (payload: UserCreateInput) => {
  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt.saltRounds,
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: hashedPassword,
      role: payload.role ?? Role.ONLINE_SALESMAN,
      phone: payload.phone,
    },
  });

  return {
    user: safeUser(user),
    tokens: buildTokens(user),
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  return {
    user: safeUser(user),
    tokens: buildTokens(user),
  };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return safeUser(user);
};

export const logoutUser = async (userId: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeenAt: new Date(),
    },
  });

  return safeUser(user);
};


export const getMe = async (userId: string): Promise<SafeUser> => {
  const result = await getById<User>(prisma.user, userId);

  return safeUser(result);
};

export const updateUserProfile = async (
  userId: string,
  payload: UserUpdateInput,
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      phone: payload.phone,
      image: payload.image,
    },
  });

  return safeUser(user);
};

export const updateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect", 401);
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    config.bcrypt.saltRounds,
  );

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return safeUser(updatedUser);
};

export const sendForgotPasswordEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new AppError("No account found for that email", 404);
  }

  const token = generatePasswordResetToken({ id: user.id, email: user.email });
  const resetUrl = `${config.frontend.url.replace(/\/$/, "")}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });

  return {
    message: "Password reset email sent",
  };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const payload = verifyToken(token, config.jwt.refreshSecret) as {
    id: string;
    email: string;
  };

  if (!payload?.id) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    config.bcrypt.saltRounds,
  );
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return {
    user: safeUser(updatedUser),
    tokens: buildTokens(updatedUser),
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError("Refresh token missing", 401);
  }

  const payload = verifyToken(refreshToken, config.jwt.refreshSecret) as {
    id: string;
    email: string;
    role: string;
  };

  if (!payload?.id) {
    throw new AppError("Refresh token invalid", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    user: safeUser(user),
    tokens: buildTokens(user),
  };
};
