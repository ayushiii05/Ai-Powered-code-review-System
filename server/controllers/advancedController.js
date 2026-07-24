import Documentation from '../models/Documentation.js';
import ConvertedCode from '../models/ConvertedCode.js';
import Notification from '../models/Notification.js';
import { generateDocumentation, convertCodeLanguage } from '../services/groqService.js';
import PDFDocument from 'pdfkit';

// @desc    Generate documentation for code
// @route   POST /api/advanced/documentation
// @access  Private
export const generateDocs = async (req, res) => {
  try {
    const { language, code, reviewId } = req.body;
    
    if (!language || !code) {
      return res.status(400).json({ message: 'Language and code are required' });
    }

    const docContent = await generateDocumentation(language, code);

    const documentation = await Documentation.create({
      userId: req.user._id,
      reviewId: reviewId || null,
      language,
      content: docContent
    });

    await Notification.create({
      userId: req.user._id,
      title: 'Documentation Generated',
      message: `Documentation for your ${language} code is ready.`,
      type: 'success'
    });

    res.status(201).json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Convert code to another language
// @route   POST /api/advanced/convert
// @access  Private
export const convertCode = async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage, code, reviewId } = req.body;
    
    if (!sourceLanguage || !targetLanguage || !code) {
      return res.status(400).json({ message: 'Source language, target language, and code are required' });
    }

    const convertedContent = await convertCodeLanguage(sourceLanguage, targetLanguage, code);

    const convertedCode = await ConvertedCode.create({
      userId: req.user._id,
      reviewId: reviewId || null,
      language: sourceLanguage,
      targetLanguage,
      content: convertedContent
    });

    await Notification.create({
      userId: req.user._id,
      title: 'Code Converted',
      message: `Successfully translated code from ${sourceLanguage} to ${targetLanguage}.`,
      type: 'success'
    });

    res.status(201).json({
      success: true,
      data: convertedCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Export report as PDF, MD, or TXT
// @route   POST /api/advanced/export
// @access  Private
export const exportReport = async (req, res) => {
  try {
    const { format, documentation, language } = req.body;

    if (!format || !['pdf', 'md', 'txt'].includes(format)) {
      return res.status(400).json({ message: 'Valid format (pdf, md, txt) is required' });
    }

    if (!documentation) {
      return res.status(400).json({ message: 'No documentation available to export. Please generate it first.' });
    }

    // Build the raw text report first
    let reportText = `AI Generated Documentation\n`;
    reportText += `Generated on: ${new Date().toLocaleString()}\n`;
    reportText += `Language: ${language}\n\n`;
    reportText += `${documentation}\n`;

    if (format === 'txt' || format === 'md') {
      const contentType = format === 'md' ? 'text/markdown' : 'text/plain';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=documentation.${format}`);
      return res.send(reportText);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=documentation.pdf');
      
      doc.pipe(res);

      doc.fontSize(20).font('Helvetica-Bold').text('AI Generated Documentation', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`);
      doc.text(`Language: ${language}`);
      doc.moveDown(2);

      doc.fontSize(10).font('Courier').text(documentation);

      doc.end();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};
