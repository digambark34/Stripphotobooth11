const router = require("express").Router();
const c = require("../controllers/settingsController");

router.get("/", c.getSettings);
router.put("/", c.updateSettings);
router.delete("/template", c.deleteTemplate);

module.exports = router;
