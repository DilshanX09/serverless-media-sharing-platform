const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  // Backgrounds
  'bg-[#111111]': 'bg-base',
  'bg-[#111]': 'bg-base',
  'bg-[#151515]': 'bg-base',
  'bg-[#1a1a1a]': 'bg-surface',
  'bg-[#212121]': 'bg-surface-2',
  'bg-[#252525]': 'bg-surface-3',
  'bg-[#2a2a2a]': 'bg-surface-3',
  'bg-[#303030]': 'bg-surface-3',

  // Hover backgrounds
  'hover:bg-[#1e1e1e]': 'hover:bg-surface-2',
  'hover:bg-[#212121]': 'hover:bg-surface-2',
  'hover:bg-[#252525]': 'hover:bg-surface-3',
  'hover:bg-[#2a2a2a]': 'hover:bg-surface-3',
  'hover:bg-[#303030]': 'hover:bg-surface-3',

  // Texts (Main)
  'text-[#f0f0f0]': 'text-ink',
  'text-[#f5f5f5]': 'text-ink',
  'hover:text-[#f0f0f0]': 'hover:text-ink',

  // Texts (Secondary/Tertiary)
  'text-[#aaaaaa]': 'text-ink-2',
  'text-[#aaa]': 'text-ink-2',
  'text-[#999999]': 'text-ink-2',
  'text-[#999]': 'text-ink-2',
  'text-[#888888]': 'text-ink-3',
  'text-[#888]': 'text-ink-3',
  'text-[#666666]': 'text-ink-3',
  'text-[#666]': 'text-ink-3',
  'text-[#555555]': 'text-ink-3',
  'text-[#555]': 'text-ink-3',
  'text-[#444444]': 'text-ink-3',
  'text-[#444]': 'text-ink-3',
  'text-[#333333]': 'text-ink-3',
  'text-[#333]': 'text-ink-3',
  'hover:text-[#888]': 'hover:text-ink-3',
  'hover:text-[#999]': 'hover:text-ink-2',
  
  // Placeholders
  'placeholder-[#555]': 'placeholder-ink-3',
  'placeholder-[#444]': 'placeholder-ink-3',

  // Borders
  'border-white/[0.05]': 'border-border-soft',
  'border-white/[0.06]': 'border-border-soft',
  'border-white/[0.07]': 'border-border-soft',
  'border-white/[0.08]': 'border-border-soft',
  'border-white/[0.1]': 'border-border-mid',
  'border-white/[0.12]': 'border-border-mid',
  'border-white/[0.13]': 'border-border-mid',
  'border-white/[0.18]': 'border-border-strong',
  'border-white/[0.22]': 'border-border-strong',
  'border-white/[0.25]': 'border-border-strong',
  'hover:border-white/[0.12]': 'hover:border-border-mid',
  'hover:border-white/[0.13]': 'hover:border-border-mid',
  'hover:border-white/[0.18]': 'hover:border-border-strong',
  'hover:border-white/[0.25]': 'hover:border-border-strong',

  // Brand color mapping
  'bg-[#e8ff47]': 'bg-brand',
  'hover:bg-[#d9f03a]': 'hover:bg-brand hover:brightness-95', 
  'hover:bg-[#e8ff47]': 'hover:bg-brand',
  'text-[#e8ff47]': 'text-brand',
  'hover:text-[#e8ff47]': 'hover:text-brand',
  'border-[#e8ff47]': 'border-brand',
  'fill-[#e8ff47]': 'fill-brand',
  
  // Translucent Brand
  'bg-[#e8ff47]/10': 'bg-brand/10',
  'bg-[#e8ff47]/5': 'bg-brand/5',
  'text-[#e8ff47]/90': 'text-brand/90',
  'text-[#e8ff47]/80': 'text-brand/80',
  'text-[#e8ff47]/70': 'text-brand/70',
  'text-[#e8ff47]/60': 'text-brand/60',
  'border-[#e8ff47]/10': 'border-brand/10',
  'border-[#e8ff47]/20': 'border-brand/20',
  'border-[#e8ff47]/30': 'border-brand/30',
  'border-[#e8ff47]/40': 'border-brand/40',
  'shadow-[#e8ff47]/10': 'shadow-brand/10',

  // Specific tricky ones
  'bg-[rgba(232,255,71,0.08)]': 'bg-brand/10',
  'border-[rgba(232,255,71,0.2)]': 'border-brand/20',
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done replacing colors.');
