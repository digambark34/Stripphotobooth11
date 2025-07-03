exports.login = (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Invalid input format" });
    }

    // Secure comparison
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
      return res.json({ success: true });
    }

    res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
