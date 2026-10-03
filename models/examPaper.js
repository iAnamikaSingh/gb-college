import mongoose from "mongoose";

const bcaPaperSchema = new mongoose.Schema(
  {
    batch: {
      type: String,
      required: true,
    },

    semester: {
      type: Number,
      required: true,
    },
    group: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["combined", "solution"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

bcaPaperSchema.index({ batch: 1, semester: 1, type: 1, group: 1 });

const BCAPaper = mongoose.model("ExamPaper", bcaPaperSchema);
export default BCAPaper;
