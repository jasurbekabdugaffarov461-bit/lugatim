function publicUser(user, req) {
  return {
    id: user.id,
    email: user.email,
    avatarUrl: user.avatar_path ? `${req.protocol}://${req.get('host')}${user.avatar_path}` : null,
    isAdmin: Boolean(user.is_admin),
  };
}

module.exports = { publicUser };
