export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "请先登录。"
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: "你没有权限执行此操作。"
      });
    }

    return next();
  };
}
