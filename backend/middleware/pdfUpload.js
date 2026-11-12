
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      /\.pdf$/i.test(file.originalname);

    if (!isPdf) {
      return cb(new Error("Only PDF files are allowed."));
    }

    cb(null, true);
  },
});


export function uploadSinglePdf(req, res, next) {
  const startedAt = Date.now();

  console.log("\n[PDF Upload] Incoming report upload");

  upload.single("report")(req, res, (error) => {
    const duration = Date.now() - startedAt;

    if (error) {
      console.error("[PDF Upload] Upload failed", {
        error: error.message,
        durationMs: duration,
      });

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            error: "PDF cannot exceed 10 MB.",
          });
        }

        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message || "Invalid PDF upload.",
      });
    }

    if (!req.file) {
      console.warn("[PDF Upload] No file received");

      return res.status(400).json({
        success: false,
        error: "Please upload a PDF report.",
      });
    }

    console.log("[PDF Upload] Upload completed", {
      mimeType: req.file.mimetype,
      sizeMB: (req.file.size / (1024 * 1024)).toFixed(2),
      storage: "memory",
      durationMs: duration,
    });

    next();
  });
}
