// Curated placement tracks → topic requirements mapped to recruitment patterns.
// `target` = number of DISTINCT accepted problems in that tag to be "ready".
// Readiness is then derived from each student's actual solved problems.

const TRACKS = [
  {
    key: 'faang',
    label: 'FAANG / Big Tech',
    color: 'var(--brand)',
    companies: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'],
    focus: 'Hard DSA · System Design · Behavioral',
    topics: [
      { topic: 'array',                label: 'Arrays',              target: 8 },
      { topic: 'string',               label: 'Strings',             target: 5 },
      { topic: 'tree',                 label: 'Trees',               target: 6 },
      { topic: 'graph',                label: 'Graphs',              target: 5 },
      { topic: 'dynamic programming',  label: 'Dynamic Programming', target: 8 },
      { topic: 'backtracking',         label: 'Backtracking',        target: 3 },
      { topic: 'heap',                 label: 'Heaps',               target: 3 },
      { topic: 'binary search',        label: 'Binary Search',       target: 4 },
    ],
  },
  {
    key: 'product',
    label: 'Product Companies',
    color: 'var(--purple)',
    companies: ['Flipkart', 'Swiggy', 'Zomato', 'Razorpay', 'CRED'],
    focus: 'Medium DSA · OOD',
    topics: [
      { topic: 'array',               label: 'Arrays',              target: 6 },
      { topic: 'string',              label: 'Strings',             target: 5 },
      { topic: 'hashmap',             label: 'Hash Maps',           target: 4 },
      { topic: 'tree',                label: 'Trees',               target: 4 },
      { topic: 'dynamic programming', label: 'Dynamic Programming', target: 4 },
      { topic: 'sorting',             label: 'Sorting',             target: 3 },
    ],
  },
  {
    key: 'service',
    label: 'Service Companies',
    color: 'var(--success)',
    companies: ['TCS', 'Infosys', 'Wipro', 'HCL', 'Cognizant'],
    focus: 'Easy–Medium DSA · Aptitude',
    topics: [
      { topic: 'array',       label: 'Arrays',       target: 5 },
      { topic: 'string',      label: 'Strings',      target: 4 },
      { topic: 'sorting',     label: 'Sorting',      target: 3 },
      { topic: 'linked list', label: 'Linked Lists', target: 3 },
      { topic: 'hashmap',     label: 'Hash Maps',    target: 2 },
    ],
  },
  {
    key: 'gate',
    label: 'GATE / Higher Studies',
    color: 'var(--warning)',
    companies: ['IITs', 'IISc', 'NITs', 'PSUs'],
    focus: 'Algorithms · Complexity · Core CS',
    topics: [
      { topic: 'array',               label: 'Arrays',              target: 3 },
      { topic: 'sorting',             label: 'Sorting',             target: 3 },
      { topic: 'tree',                label: 'Trees',               target: 3 },
      { topic: 'graph',               label: 'Graphs',              target: 3 },
      { topic: 'dynamic programming', label: 'Dynamic Programming', target: 3 },
      { topic: 'greedy',              label: 'Greedy',              target: 2 },
    ],
  },
];

module.exports = { TRACKS };
