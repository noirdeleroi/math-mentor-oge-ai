import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://kbaazksvkvnafrwtmkcw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYWF6a3N2a3ZuYWZyd3Rta2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTg2NTAsImV4cCI6MjA2MjMzNDY1MH0.aSyfch6PX1fr9wyWSGpUPNzT6jjIdfu9eA3E3J4uqzs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Seeded RNG + shuffle (unchanged)
function seededRandom(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }
function shuffleWithSeed(array, seed) { const rnd = seededRandom(seed); const a = [...array]; for (let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

const questionTypes = [
  { label: '1-5', number: 1 },
  ...Array.from({ length: 20 }, (_, i) => ({ label: String(i + 6), number: i + 6 }))
];

async function generatePages() {
  try {
    const template = readFileSync(join(__dirname, 'template.html'), 'utf-8');
    const outputDir = join(__dirname, '../../../public/questionbankoge');
    const sitemapUrls = [];

    // helpers for escaping exactly where needed
    const sanitizeHtml = (str) =>
      (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\n/g, '<br>');
    const escapeAttr = (str) =>
      (str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    for (const { label, number } of questionTypes) {
      console.log(`Generating page for ${label}...`);

      try {
        // timeout wrapper unchanged
        const fetchPromise = supabase.from('oge_math_fipi_bank').select('*').eq('problem_number_type', number);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 30000));
        const { data: allQuestions, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) { console.error(`Error fetching questions for ${label}:`, error); continue; }
        if (!allQuestions || allQuestions.length === 0) { console.warn(`No questions found for problem_number_type ${number}`); continue; }

        // deterministic 30
        const seed = 12345 + number;
        const questions = shuffleWithSeed(allQuestions, seed).slice(0, 30);

        // filter + render
        const validQuestions = questions.filter(q => q.problem_text && q.problem_text.trim());
        if (!validQuestions.length) { console.warn(`No valid questions found for ${label}, skipping...`); continue; }
        console.log(`Found ${validQuestions.length} valid questions for ${label}`);

         const questionsHtml = validQuestions.map((q, idx) => {
           const problemText = sanitizeHtml(q.problem_text || '');
           const answerAttr = escapeAttr(q.answer || '');
           const imageSrc = q.problem_image ? escapeAttr(q.problem_image) : '';

           return `
       <div class="question-item">
         <div class="question-number">Вопрос ${idx + 1}</div>
         ${q.problem_image ? `<img src="${imageSrc}" alt="Problem image" class="problem-image" />` : ''}
         <div class="problem-text">${problemText}</div>
         <button class="show-answer-btn"
                 data-answer="${answerAttr}"
                 onclick="showAnswer(${idx}, this.dataset.answer)">
           Показать ответ
         </button>
         <div id="answer-${idx}" class="answer-display"></div>
         <button class="show-solution-btn" onclick="showSolutionModal()">
           Показать решение
         </button>
       </div>
     `;
        }).join('');

        const titleText = `Задание ${label}`;
        const html = template
          .replace(/\{\{TITLE\}\}/g, titleText)
          .replace('{{QUESTIONS}}', questionsHtml);

        // Verify title replacement worked
        if (html.includes('{{TITLE}}')) {
          console.warn(`Warning: {{TITLE}} not replaced in ${label}`);
        }

        const pageDir = join(outputDir, label);
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(join(pageDir, 'index.html'), html, 'utf-8');

        sitemapUrls.push(`/questionbankoge/${label}/`);
        console.log(`✓ Generated ${label}`);
      } catch (error) {
        console.error(`Error generating page for ${label}:`, error);
        continue;
      }
    }

    // sitemap (unchanged)
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
    console.log(`\nDone! Generated ${sitemapUrls.length} pages successfully.`);
  } catch (error) {
    console.error('Fatal error during page generation:', error);
    process.exit(1);
  }
}

generatePages().catch(console.error);
