const router = require("express").Router();
const c = require("../controllers/stripController");
router.post("/", c.uploadStrip);
router.get("/", c.getStrips);
router.delete("/all", c.deleteAllStrips); // Delete all strips route (must be before /:id)
router.delete("/:id", c.deleteStrip);
router.patch("/:id/mark-printed", c.markPrinted);
module.exports = router;
