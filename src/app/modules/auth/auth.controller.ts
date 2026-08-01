import { Request, Response } from "express";
import catchAsync from "../../common/catchAsync";
import sendResponse from "../../common/sendResponse";
import * as AuthService from "./auth.service";
import { clearAuthCookies, setAuthCookies } from "../../utils/authCookies";
import { HttpStatus } from "../../utils/httpStatus";

export const register = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await AuthService.registerUser(req.body);

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Registration completed successfully",
    data: user,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await AuthService.loginUser(
    req.body.email,
    req.body.password,
  );

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Login successful",
    data: { user },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutUser(req.user.id);
  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});


export const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getMe(req.user.id);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await AuthService.getUserProfile(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile fetched successfully",
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await AuthService.updateUserProfile(req.user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});

export const updatePassword = catchAsync(
  async (req: Request, res: Response) => {
    const user = await AuthService.updateUserPassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Password updated successfully",
      data: { user },
    });
  },
);

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    await AuthService.sendForgotPasswordEmail(req.body.email);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "If the email exists, a reset link has been sent",
      data: null,
    });
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await AuthService.resetPassword(
    req.body.token,
    req.body.newPassword,
  );

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successfully",
    data: { user },
  });
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  const { user, tokens } = await AuthService.refreshAccessToken(refreshToken);

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token refreshed successfully",
    data: { user },
  });
});
