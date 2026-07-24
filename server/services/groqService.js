import Groq from 'groq-sdk';

export const getCodeReview = async (language, code) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `You are an expert ${language} code reviewer.
Review the following code:
\`\`\`${language}
${code}
\`\`\`

Return your response in STRICT JSON format with the following schema exactly. Do not include any other text or markdown wrappers, just the raw JSON object:
{
  "title": "A short, descriptive 3-5 word title for this code snippet",
  "overallScore": "0-10",
  "summary": "Brief summary of the code quality",
  "bugs": ["List of bugs or empty array if none"],
  "securityIssues": ["List of security issues or empty array if none"],
  "performanceSuggestions": ["List of performance tips or empty array"],
  "readabilitySuggestions": ["List of readability tips or empty array"],
  "bestPractices": ["List of best practices violated or empty array"],
  "optimizedCode": "The fully optimized and refactored code (as a string)",
  "timeComplexity": "e.g., O(n)",
  "spaceComplexity": "e.g., O(1)"
}

If there are no issues in a category, return an empty array [].`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const resultText = chatCompletion.choices[0]?.message?.content;
    
    // Safely parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }
    
    return parsedData;
  } catch (error) {
    console.error('Groq API Error details:', error);
    
    if (error.status === 429) {
      throw new Error('Groq API Quota Exceeded. Please try again later.');
    } else if (error.status === 401 || error.status === 403) {
      throw new Error('Invalid Groq API Key or permissions denied.');
    }
    
    throw new Error(error.message || 'Failed to generate AI code review from Groq.');
  }
};

export const sendChatMessage = async (language, code, reviewData, chatHistory, newMessage) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const systemPrompt = `You are a Senior Software Engineer assisting a user with their ${language} code. 
You are deeply knowledgeable about best practices, performance, security, and readability.

Here is the user's current code:
\`\`\`${language}
${code}
\`\`\`

Here is the latest AI Code Review summary for context:
${reviewData ? JSON.stringify(reviewData) : 'None available.'}

Instructions:
1. Answer the user's questions clearly and concisely.
2. If the user asks for code, provide fully optimized and refactored code blocks using markdown.
3. Be friendly, professional, and act as a mentor.
4. You may explain code, find bugs, optimize, generate tests, or convert languages based on their request.`;

  // Format history for Groq
  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: newMessage }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
    });

    return chatCompletion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq Chat API Error details:', error);
    
    if (error.status === 429) {
      throw new Error('Groq API Quota Exceeded. Please try again later.');
    } else if (error.status === 401 || error.status === 403) {
      throw new Error('Invalid Groq API Key or permissions denied.');
    }
    
    throw new Error(error.message || 'Failed to send chat message to Groq.');
  }
};

export const generateDocumentation = async (language, code) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `You are a Senior Technical Writer and Software Engineer. 
Write professional, comprehensive documentation for the following ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Requirements:
1. Provide a high-level overview of what the code does.
2. Provide JSDoc (or equivalent format for ${language}) comments for all functions, classes, and complex logic.
3. Include usage examples if applicable.
4. Format the output entirely in Markdown. Do not wrap the response in any markdown code blocks that encapsulate the entire response, just return the raw markdown text.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    return chatCompletion.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error('Groq Documentation Error details:', error);
    throw new Error(error.message || 'Failed to generate documentation.');
  }
};

export const convertCodeLanguage = async (sourceLanguage, targetLanguage, code) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `You are a Senior Software Engineer. 
Translate the following ${sourceLanguage} code into highly idiomatic ${targetLanguage} code.

Code:
\`\`\`${sourceLanguage}
${code}
\`\`\`

Requirements:
1. Translate the logic accurately.
2. Use standard ${targetLanguage} conventions and best practices.
3. Retain any comments from the original code.
4. ONLY return the translated code wrapped in a \`\`\`${targetLanguage} code block. Do NOT include any explanations or other text.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    let result = chatCompletion.choices[0]?.message?.content?.trim();
    // Extract code from markdown block if present
    const codeBlockMatch = result.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      result = codeBlockMatch[1].trim();
    }
    return result;
  } catch (error) {
    console.error('Groq Convert Error details:', error);
    throw new Error(error.message || 'Failed to convert code.');
  }
};

export const analyzeProjectStructure = async (files, projectInfo) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  let codeContext = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n');
  if (codeContext.length > 15000) {
    codeContext = codeContext.slice(0, 15000) + '\n\n... [TRUNCATED DUE TO API LIMITS]';
  }

  const prompt = `You are an Expert Software Architect.
Review the following project:
Project Name: ${projectInfo.projectName}
Framework: ${projectInfo.framework}
Languages: ${projectInfo.languages?.join(', ')}

Code:
${codeContext}

Return your response in STRICT JSON format with the following schema exactly:
{
  "overallScore": "0-10",
  "summary": "High-level summary of the project architecture and quality",
  "architectureAnalysis": "Detailed analysis of the chosen architecture",
  "folderStructureAnalysis": "Feedback on how files/folders are organized",
  "codeQuality": "Overall assessment of code quality across files",
  "securityIssues": ["List of security issues or empty array"],
  "performanceSuggestions": ["List of performance tips or empty array"],
  "bestPractices": ["List of best practices violated or empty array"],
  "missingFeatures": ["List of missing essential features"],
  "potentialBugs": ["List of bugs"],
  "recommendations": ["List of recommendations"]
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const resultText = chatCompletion.choices[0]?.message?.content;
    try {
      return JSON.parse(resultText);
    } catch (parseError) {
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
  } catch (error) {
    import('fs').then(fs => fs.appendFileSync('crash-groq.log', (error.stack || error.toString()) + '\\n'));
    console.error('Groq API Error:', error);
    throw new Error(error.message || 'Failed to analyze project architecture.');
  }
};

export const generateProjectDocs = async (files, projectInfo, reviewData) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  let codeContext = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n');
  if (codeContext.length > 15000) {
    codeContext = codeContext.slice(0, 15000) + '\n\n... [TRUNCATED DUE TO API LIMITS]';
  }

  const prompt = `You are a Senior Technical Writer. Write professional README documentation for this project.

Project Name: ${projectInfo.projectName}
Framework: ${projectInfo.framework}

Code Snapshot:
${codeContext}

AI Review Context:
${JSON.stringify(reviewData)}

Requirements:
Format entirely in Markdown. Include sections:
- Project Overview
- Tech Stack
- Folder Structure
- Main Features
- Architecture Explanation
- API / Database Summary (if applicable)
- Installation Steps (infer from framework)
- How to Run the Project
- Future Improvements

Do NOT wrap the response in markdown code blocks (\`\`\`markdown). Just return raw markdown text.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    return chatCompletion.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error('Groq API Error:', error);
    throw new Error('Failed to generate project documentation.');
  }
};

export const sendProjectChatMessage = async (files, projectInfo, reviewData, chatHistory, newMessage) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  let codeContext = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n');
  if (codeContext.length > 15000) {
    codeContext = codeContext.slice(0, 15000) + '\n\n... [TRUNCATED DUE TO API LIMITS]';
  }
  
  const systemPrompt = `You are a Senior Software Architect assisting a user with their project.
You are deeply knowledgeable about best practices, performance, security, and architecture.

Project Name: ${projectInfo.projectName}
Framework: ${projectInfo.framework}
Languages: ${projectInfo.languages?.join(', ')}

Here is a snapshot of the most relevant source code:
${codeContext}

Here is the latest AI Code Review summary for context:
${reviewData ? JSON.stringify(reviewData) : 'None available.'}

Instructions:
1. Answer the user's questions clearly and concisely about this project.
2. If the user asks for code, provide fully optimized code blocks using markdown.
3. Be friendly, professional, and act as a mentor.
4. You may explain architecture, find bugs, optimize, generate tests, or suggest refactors.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: newMessage }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
    });

    return chatCompletion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq Project Chat API Error details:', error);
    
    if (error.status === 429) {
      throw new Error('Groq API Quota Exceeded. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to send chat message to Groq.');
  }
};
