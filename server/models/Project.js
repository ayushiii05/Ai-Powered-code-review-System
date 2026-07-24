import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    projectName: {
      type: String,
      required: true,
    },
    projectType: {
      type: String, // 'single_file' or 'zip'
      required: true,
    },
    framework: {
      type: String,
      default: 'Unknown',
    },
    languages: [
      {
        type: String,
      }
    ],
    folderStructure: {
      type: mongoose.Schema.Types.Mixed, // Storing tree structure as JSON object
      default: {},
    },
    uploadedFiles: [
      {
        path: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        }
      }
    ],
    review: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    documentation: {
      type: String,
      default: null,
    },
    favorite: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model('Project', projectSchema);

export default Project;
