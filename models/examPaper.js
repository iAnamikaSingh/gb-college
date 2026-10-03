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
  },
  {
    timestamps: true,
  },
);

const BCAPaper = mongoose.model("ExamPaper", bcaPaperSchema);
export default BCAPaper;
