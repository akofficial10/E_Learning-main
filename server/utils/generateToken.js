import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  // Add role to the payload
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.SECRET_KEY,
    { expiresIn: "1d" }
  );

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: false, // Only true in production (when using HTTPS)
      sameSite: "lax", // Works well with localhost cross-origin
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })
    .json({
      success: true,
      message,
      user,
    });
};
