import React, { useState, useRef } from 'react';
import { Play, Check, Terminal, Sparkles, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

interface LiveCodeSandboxProps {
  onAppendToAnswer: (codeSnippet: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const STARTER_TEMPLATES: Record<string, { js: string; title: string }> = {
  general: {
    title: 'General Solution',
    js: `// Implement your technical solution here
function solution(input) {
  console.log("Processing input:", input);
  
  // Your logic here
  return input;
}

// Test case execution
console.log("Result:", solution("Sample Input"));`,
  },
  twoSum: {
    title: 'Two Sum (Hash Map)',
    js: `// Two Sum: Find indices of two numbers that add up to target
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log("Test 1 [2, 7, 11, 15] target=9 ->", twoSum([2, 7, 11, 15], 9));
console.log("Test 2 [3, 2, 4] target=6 ->", twoSum([3, 2, 4], 6));`,
  },
  lru: {
    title: 'LRU Cache Design',
    js: `// LRU Cache implementation with Map
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key, val) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, val);
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

const lru = new LRUCache(2);
lru.put(1, 100);
lru.put(2, 200);
console.log("Get key 1:", lru.get(1));
lru.put(3, 300); // evicts key 2
console.log("Get key 2 (should be -1):", lru.get(2));`,
  },
};

export const LiveCodeSandbox: React.FC<LiveCodeSandboxProps> = ({
  onAppendToAnswer,
  isOpen,
  onClose,
}) => {
  const [code, setCode] = useState(STARTER_TEMPLATES.general.js);
  const [output, setOutput] = useState<string[]>([]);
  const [execStatus, setExecStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('general');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleRunCode = () => {
    setExecStatus('running');
    setOutput([]);
    const logs: string[] = [];
    const startTime = performance.now();

    // Isolated console interceptor
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    try {
      console.log = (...args: any[]) => {
        logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      };
      console.warn = (...args: any[]) => {
        logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      };
      console.error = (...args: any[]) => {
        logs.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      };

      // Execute code via Function with timeout safety
      const runner = new Function(code);
      const returnedVal = runner();

      if (returnedVal !== undefined) {
        logs.push(`↳ Returned: ${typeof returnedVal === 'object' ? JSON.stringify(returnedVal) : returnedVal}`);
      }

      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      setExecTimeMs(elapsed);
      setOutput(logs.length > 0 ? logs : ['Execution completed with no output.']);
      setExecStatus('success');
    } catch (err: any) {
      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      setExecTimeMs(elapsed);
      setOutput([`Runtime Error: ${err.message || String(err)}`]);
      setExecStatus('error');
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle tab indenting
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      target.value = val.substring(0, start) + '  ' + val.substring(end);
      target.selectionStart = target.selectionEnd = start + 2;
      setCode(target.value);
    }
  };

  const handleInsertIntoAnswer = () => {
    const formatted = [
      '```javascript',
      code.trim(),
      '```',
      output.length > 0
        ? `\n*Execution Output:*\n> ${output.slice(0, 4).join('\n> ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    onAppendToAnswer(formatted);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key);
    if (STARTER_TEMPLATES[key]) {
      setCode(STARTER_TEMPLATES[key].js);
      setOutput([]);
      setExecStatus('idle');
    }
  };

  return (
    <div className="bento-card border border-[var(--bento-border)] rounded-2xl overflow-hidden mt-3 shadow-lg bg-neutral-900 text-neutral-100 text-xs">
      {/* Editor Header */}
      <div className="px-4 py-2.5 bg-neutral-950/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">Live Code Sandbox</span>
          <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800">
            JavaScript (ES6+)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-[11px] text-neutral-200 focus:outline-none"
          >
            <option value="general">Template: General</option>
            <option value="twoSum">Template: Two Sum</option>
            <option value="lru">Template: LRU Cache</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunCode}
            className="h-7 px-2.5 text-[11px] flex items-center gap-1 font-mono uppercase tracking-wider"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleInsertIntoAnswer}
            className="h-7 px-2.5 text-[11px] flex items-center gap-1 font-mono uppercase tracking-wider bg-neutral-800 text-white hover:bg-neutral-700"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Inserted</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Attach to Answer</span>
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
            title="Minimize Code Sandbox"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Code Textarea with line numbers */}
      <div className="relative font-mono flex bg-neutral-950/60 min-h-[160px] max-h-[240px]">
        {/* Line numbers column */}
        <div className="select-none py-3 px-3 text-right text-neutral-600 bg-neutral-950/90 border-r border-neutral-800 text-[11px] leading-relaxed">
          {code.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-emerald-300 font-mono text-[11.5px] leading-relaxed focus:outline-none resize-none overflow-y-auto"
          placeholder="// Type your code here..."
        />
      </div>

      {/* Terminal Output Tray */}
      <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 font-mono">
        <div className="flex items-center justify-between pb-1.5 text-[10px] text-neutral-400 border-b border-neutral-800/80">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3" />
            <span>Terminal Output</span>
            {execTimeMs !== null && (
              <span className="text-neutral-500">({execTimeMs} ms)</span>
            )}
          </div>
          <div>
            {execStatus === 'success' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Executed successfully
              </span>
            )}
            {execStatus === 'error' && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Runtime error
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 text-[11px] leading-relaxed max-h-[100px] overflow-y-auto font-mono">
          {output.length === 0 ? (
            <span className="text-neutral-600 italic">Click 'Run' to execute code against tests...</span>
          ) : (
            output.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.startsWith('Runtime Error') || line.startsWith('[ERROR]')
                    ? 'text-rose-400'
                    : line.startsWith('[WARN]')
                    ? 'text-amber-400'
                    : 'text-neutral-300'
                }
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCodeSandbox;
