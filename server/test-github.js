import { validateGithubUrl, fetchGithubRepository, fetchGithubLanguages, fetchGithubTree, fetchFileContents } from './services/githubService.js';

async function test() {
  try {
    const url = 'https://github.com/expressjs/express';
    const repoInfo = validateGithubUrl(url);
    console.log('repoInfo:', repoInfo);
    
    const details = await fetchGithubRepository(repoInfo.owner, repoInfo.repo);
    console.log('details:', details);
    
    const languages = await fetchGithubLanguages(details.languages_url);
    console.log('languages:', languages);
    
    const tree = await fetchGithubTree(repoInfo.owner, repoInfo.repo, details.defaultBranch);
    console.log('tree length:', tree.length);
    
    const { uploadedFiles, folderStructure } = await fetchFileContents(repoInfo.owner, repoInfo.repo, details.defaultBranch, tree);
    console.log('uploadedFiles:', uploadedFiles.length);
    
    console.log('Success!');
  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();
