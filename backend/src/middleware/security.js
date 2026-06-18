// Pre-flight code submission validator.
// NOT a substitute for sandbox isolation — Judge0 + isolate handle execution safety.
// Purpose: catch obvious attack patterns early, log them for audit, and reject
// the worst offenders before they consume queue capacity.

// Patterns that indicate a deliberate resource-exhaustion attack.
// False-positive rate is kept low by requiring very specific signatures.
const BOMB_PATTERNS = [
  { name: 'bash fork-bomb',          block: true,  re: /:\(\)\s*\{\s*:\s*\|\s*:/ },
  { name: 'python os.fork loop',     block: true,  re: /while\s+True[\s\S]{0,40}os\.fork\s*\(\s*\)/ },
  { name: 'c fork-bomb loop',        block: true,  re: /for\s*\(\s*;;\s*\)\s*\{[\s\S]{0,40}fork\s*\(\s*\)/ },
  { name: 'python infinite file write', block: false, re: /while\s+True[\s\S]{0,60}\.write\s*\(/ },
  { name: '/dev/full write attempt', block: true,  re: /\/dev\/(full|zero|random|urandom)/ },
  { name: 'network socket (python)', block: false, re: /import\s+(?:socket|requests|urllib|httpx|aiohttp)/ },
  { name: 'network socket (js)',     block: false, re: /require\s*\(\s*['"](?:net|http|https|axios|fetch)['"]\s*\)/ },
  { name: 'shell exec attempt',      block: false, re: /(?:os\.system|subprocess|exec\s*\(|Runtime\.getRuntime|ProcessBuilder)/ },
];

const validateSubmission = (req, res, next) => {
  const { source_code } = req.body;
  if (!source_code || typeof source_code !== 'string') return next();

  for (const { name, block, re } of BOMB_PATTERNS) {
    if (re.test(source_code)) {
      const msg = `[SECURITY] Pattern "${name}" in submission from ${req.ip}`;
      if (block) {
        console.warn(msg + ' — BLOCKED');
        return res.status(400).json({
          success: false,
          error: 'Submission rejected: code contains a prohibited pattern.',
        });
      }
      // Log-only: let the sandbox handle it; flagged for audit review
      console.warn(msg + ' — flagged (sandbox will handle)');
    }
  }

  next();
};

module.exports = { validateSubmission };
