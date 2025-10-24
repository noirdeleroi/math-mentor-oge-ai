import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://kbaazksvkvnafrwtmkcw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYWF6a3N2a3ZuYWZyd3Rta2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTg2NTAsImV4cCI6MjA2MjMzNDY1MH0.aSyfch6PX1fr9wyWSGpUPNzT6jjIdfu9eA3E3J4uqzs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Seeded random number generator
function seededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Fisher-Yates shuffle with seed
function shuffleWithSeed(array, seed) {
  const random = seededRandom(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const questionTypes = [
  { label: '1-5', number: 1 },
  ...Array.from({ length: 20 }, (_, i) => ({ label: String(i + 6), number: i + 6 }))
];

async function generatePages() {
  const template = readFileSync(join(__dirname, 'template.html'), 'utf-8');
  const outputDir = join(__dirname, '../../public/questionbankoge');
  
  const sitemapUrls = [];

  for (const { label, number } of questionTypes) {
    console.log(`Generating page for ${label}...`);

    // Fetch questions for this problem_number_type
    const { data: allQuestions, error } = await supabase
      .from('oge_math_fipi_bank')
      .select('*')
      .eq('problem_number_type', number);

    if (error) {
      console.error(`Error fetching questions for ${label}:`, error);
      continue;
    }

    if (!allQuestions || allQuestions.length === 0) {
      console.warn(`No questions found for problem_number_type ${number}`);
      continue;
    }

    // Shuffle with fixed seed and take 30
    const seed = 12345 + number;
    const shuffled = shuffleWithSeed(allQuestions, seed);
    const questions = shuffled.slice(0, 30);

    // Generate HTML for questions
    const questionsHtml = questions.map((q, idx) => `
      <div class="question-item">
        <div class="question-number">Вопрос ${idx + 1}</div>
        ${q.problem_image ? `<img src="${q.problem_image}" alt="Problem image" class="problem-image" />` : ''}
        <div class="problem-text">${q.problem_text || ''}</div>
        <div class="answer-section">
          <input type="text" class="answer-input" placeholder="Ваш ответ" />
          <button class="show-answer-btn" onclick="showAnswer(${idx}, '${(q.answer || '').replace(/'/g, "\\'")}')">
            Показать ответ
          </button>
          <div id="answer-${idx}" class="answer-display"></div>
        </div>
        <button class="show-solution-btn" onclick="showSolutionModal()">
          Показать решение
        </button>
      </div>
    `).join('');

    // Fill template
    const html = template
      .replace('{{TITLE}}', `Задание ${label}`)
      .replace('{{QUESTIONS}}', questionsHtml);

    // Write to file
    const pageDir = join(outputDir, label);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(join(pageDir, 'index.html'), html, 'utf-8');

    sitemapUrls.push(`/questionbankoge/${label}/`);
    console.log(`✓ Generated ${label}`);
  }

  // Generate sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>
    <loc>https://yourdomain.com${url}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

  writeFileSync(join(outputDir, 'sitemap.xml'), sitemap, 'utf-8');
  console.log('✓ Generated sitemap.xml');
  console.log(`\nDone! Generated ${questionTypes.length} pages.`);
}

generatePages().catch(console.error);
