import mongoose from 'mongoose';

const githubRepositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    repositoryName: {
      type: String,
      required: true,
    },
    repositoryUrl: {
      type: String,
      required: true,
    },
    owner: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    languages: [
      {
        type: String,
      }
    ],
    folderStructure: {
      type: mongoose.Schema.Types.Mixed,
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

const GithubRepository = mongoose.model('GithubRepository', githubRepositorySchema);

export default GithubRepository;
