import express from "express";
import upload from "../middleware/upload.js";
import uploadToCloudinary from "../services/mediaUpload.js";

const router = express.Router();

router.post("/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Image file is required",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Please upload an image",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "ascend/exercises/images",
      "image"
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Image upload failed:", error);

    return res.status(500).json({
      message: "Image upload failed",
    });
  }
});

router.post("/video", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Video file is required",
      });
    }

    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        message: "Please upload a video",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      "ascend/exercises/videos",
      "video"
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Video upload failed:", error);

    return res.status(500).json({
      message: "Video upload failed",
    });
  }
});

export default router;