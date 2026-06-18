const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/db');

const problems = [
  // Arrays & Hashing
  {
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    difficulty: "Easy",
    tags: ["Arrays", "Hashing"],
    testCases: [
      { input: "4\n2 7 11 15\n9", expected: "0 1" },
      { input: "3\n3 2 4\n6", expected: "1 2" },
      { input: "2\n3 3\n6", expected: "0 1" }
    ]
  },
  {
    title: "Contains Duplicate",
    description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    difficulty: "Easy",
    tags: ["Arrays", "Hashing"],
    testCases: [
      { input: "4\n1 2 3 1", expected: "true" },
      { input: "4\n1 2 3 4", expected: "false" },
      { input: "10\n1 1 1 3 3 4 3 2 4 2", expected: "true" }
    ]
  },
  {
    title: "Valid Anagram",
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    difficulty: "Easy",
    tags: ["Strings", "Hashing"],
    testCases: [
      { input: "anagram\nnagaram", expected: "true" },
      { input: "rat\ncar", expected: "false" },
      { input: "a\nab", expected: "false" }
    ]
  },
  {
    title: "Group Anagrams",
    description: "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.",
    difficulty: "Medium",
    tags: ["Strings", "Hashing"],
    testCases: [
      { input: "6\neat tea tan ate nat bat", expected: "bat\nnat tan\nate eat tea" }, // Note: output ordering depends on implementation, standard judge might need a special checker or sorted output
      { input: "1\n", expected: "" },
      { input: "1\na", expected: "a" }
    ]
  },
  {
    title: "Top K Frequent Elements",
    description: "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    difficulty: "Medium",
    tags: ["Arrays", "Hashing", "Heap"],
    testCases: [
      { input: "6\n1 1 1 2 2 3\n2", expected: "1 2" },
      { input: "1\n1\n1", expected: "1" }
    ]
  },
  {
    title: "Product of Array Except Self",
    description: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    difficulty: "Medium",
    tags: ["Arrays", "Prefix Sum"],
    testCases: [
      { input: "4\n1 2 3 4", expected: "24 12 8 6" },
      { input: "5\n-1 1 0 -3 3", expected: "0 0 9 0 0" }
    ]
  },

  // Two Pointers
  {
    title: "Valid Palindrome",
    description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
    difficulty: "Easy",
    tags: ["Strings", "Two Pointers"],
    testCases: [
      { input: "A man, a plan, a canal: Panama", expected: "true" },
      { input: "race a car", expected: "false" },
      { input: " ", expected: "true" }
    ]
  },
  {
    title: "Two Sum II - Input Array Is Sorted",
    description: "Given a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number.\nReturn the indices of the two numbers, 1-indexed.",
    difficulty: "Medium",
    tags: ["Arrays", "Two Pointers"],
    testCases: [
      { input: "4\n2 7 11 15\n9", expected: "1 2" },
      { input: "3\n2 3 4\n6", expected: "1 3" },
      { input: "2\n-1 0\n-1", expected: "1 2" }
    ]
  },
  {
    title: "Container With Most Water",
    description: "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `ith` line are `(i, 0)` and `(i, height[i])`.\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\nReturn the maximum amount of water a container can store.",
    difficulty: "Medium",
    tags: ["Arrays", "Two Pointers", "Greedy"],
    testCases: [
      { input: "9\n1 8 6 2 5 4 8 3 7", expected: "49" },
      { input: "2\n1 1", expected: "1" }
    ]
  },

  // Sliding Window
  {
    title: "Best Time to Buy and Sell Stock",
    description: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day.\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\nReturn the maximum profit you can achieve. If you cannot achieve any profit, return `0`.",
    difficulty: "Easy",
    tags: ["Arrays", "Sliding Window"],
    testCases: [
      { input: "6\n7 1 5 3 6 4", expected: "5" },
      { input: "5\n7 6 4 3 1", expected: "0" }
    ]
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description: "Given a string `s`, find the length of the longest substring without repeating characters.",
    difficulty: "Medium",
    tags: ["Strings", "Sliding Window"],
    testCases: [
      { input: "abcabcbb", expected: "3" },
      { input: "bbbbb", expected: "1" },
      { input: "pwwkew", expected: "3" }
    ]
  },
  {
    title: "Longest Repeating Character Replacement",
    description: "You are given a string `s` and an integer `k`. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most `k` times.\nReturn the length of the longest substring containing the same letter you can get after performing the above operations.",
    difficulty: "Medium",
    tags: ["Strings", "Sliding Window"],
    testCases: [
      { input: "ABAB\n2", expected: "4" },
      { input: "AABABBA\n1", expected: "4" }
    ]
  },

  // Stack
  {
    title: "Valid Parentheses",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.",
    difficulty: "Easy",
    tags: ["Stack", "Strings"],
    testCases: [
      { input: "()", expected: "true" },
      { input: "()[]{}", expected: "true" },
      { input: "(]", expected: "false" }
    ]
  },
  {
    title: "Min Stack",
    description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    difficulty: "Medium",
    tags: ["Stack", "Design"],
    testCases: [
      { input: "7\npush -2\npush 0\npush -3\ngetMin\npop\ntop\ngetMin", expected: "-3\n0\n-2" }
    ]
  },
  {
    title: "Evaluate Reverse Polish Notation",
    description: "Evaluate the value of an arithmetic expression in Reverse Polish Notation.\nValid operators are `+`, `-`, `*`, and `/`.",
    difficulty: "Medium",
    tags: ["Stack", "Math"],
    testCases: [
      { input: "5\n2 1 + 3 *", expected: "9" },
      { input: "5\n4 13 5 / +", expected: "6" }
    ]
  },

  // Binary Search
  {
    title: "Binary Search",
    description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.",
    difficulty: "Easy",
    tags: ["Arrays", "Binary Search"],
    testCases: [
      { input: "6\n-1 0 3 5 9 12\n9", expected: "4" },
      { input: "6\n-1 0 3 5 9 12\n2", expected: "-1" }
    ]
  },
  {
    title: "Search a 2D Matrix",
    description: "Write an efficient algorithm that searches for a value `target` in an `m x n` integer matrix `matrix`. This matrix has the following properties:\nIntegers in each row are sorted from left to right.\nThe first integer of each row is greater than the last integer of the previous row.",
    difficulty: "Medium",
    tags: ["Arrays", "Binary Search", "Matrix"],
    testCases: [
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n3", expected: "true" },
      { input: "3 4\n1 3 5 7\n10 11 16 20\n23 30 34 60\n13", expected: "false" }
    ]
  },
  {
    title: "Find Minimum in Rotated Sorted Array",
    description: "Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times. Given the sorted rotated array `nums` of unique elements, return the minimum element of this array.",
    difficulty: "Medium",
    tags: ["Arrays", "Binary Search"],
    testCases: [
      { input: "5\n3 4 5 1 2", expected: "1" },
      { input: "7\n4 5 6 7 0 1 2", expected: "0" }
    ]
  },

  // Linked List
  {
    title: "Reverse Linked List",
    description: "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
    difficulty: "Easy",
    tags: ["Linked List"],
    testCases: [
      { input: "5\n1 2 3 4 5", expected: "5 4 3 2 1" },
      { input: "2\n1 2", expected: "2 1" }
    ]
  },
  {
    title: "Merge Two Sorted Lists",
    description: "You are given the heads of two sorted linked lists `list1` and `list2`.\nMerge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists.\nReturn the head of the merged linked list.",
    difficulty: "Easy",
    tags: ["Linked List"],
    testCases: [
      { input: "3\n1 2 4\n3\n1 3 4", expected: "1 1 2 3 4 4" },
      { input: "0\n\n0\n", expected: "" }
    ]
  },
  {
    title: "Remove Nth Node From End of List",
    description: "Given the `head` of a linked list, remove the `nth` node from the end of the list and return its head.",
    difficulty: "Medium",
    tags: ["Linked List", "Two Pointers"],
    testCases: [
      { input: "5\n1 2 3 4 5\n2", expected: "1 2 3 5" },
      { input: "1\n1\n1", expected: "" }
    ]
  },

  // Trees
  {
    title: "Invert Binary Tree",
    description: "Given the `root` of a binary tree, invert the tree, and return its root.",
    difficulty: "Easy",
    tags: ["Trees", "DFS", "BFS"],
    testCases: [
      { input: "4 2 7 1 3 6 9", expected: "4 7 2 9 6 3 1" }, // Pre-order or level-order string representation expected depending on judge wrapper
      { input: "2 1 3", expected: "2 3 1" }
    ]
  },
  {
    title: "Maximum Depth of Binary Tree",
    description: "Given the `root` of a binary tree, return its maximum depth.\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    difficulty: "Easy",
    tags: ["Trees", "DFS", "BFS"],
    testCases: [
      { input: "3 9 20 null null 15 7", expected: "3" },
      { input: "1 null 2", expected: "2" }
    ]
  },
  {
    title: "Subtree of Another Tree",
    description: "Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a subtree of `root` with the same structure and node values of `subRoot` and `false` otherwise.",
    difficulty: "Easy",
    tags: ["Trees", "DFS"],
    testCases: [
      { input: "3 4 5 1 2\n4 1 2", expected: "true" },
      { input: "3 4 5 1 2 null null null null 0\n4 1 2", expected: "false" }
    ]
  },

  // Dynamic Programming
  {
    title: "Climbing Stairs",
    description: "You are climbing a staircase. It takes `n` steps to reach the top.\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    difficulty: "Easy",
    tags: ["Dynamic Programming", "Math"],
    testCases: [
      { input: "2", expected: "2" },
      { input: "3", expected: "3" },
      { input: "5", expected: "8" }
    ]
  },
  {
    title: "Min Cost Climbing Stairs",
    description: "You are given an integer array `cost` where `cost[i]` is the cost of `ith` step on a staircase. Once you pay the cost, you can either climb one or two steps.\nYou can either start from the step with index `0`, or the step with index `1`.\nReturn the minimum cost to reach the top of the floor.",
    difficulty: "Easy",
    tags: ["Dynamic Programming", "Arrays"],
    testCases: [
      { input: "3\n10 15 20", expected: "15" },
      { input: "10\n1 100 1 1 1 100 1 1 100 1", expected: "6" }
    ]
  },
  {
    title: "Coin Change",
    description: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.",
    difficulty: "Medium",
    tags: ["Dynamic Programming", "BFS"],
    testCases: [
      { input: "3\n1 2 5\n11", expected: "3" },
      { input: "1\n2\n3", expected: "-1" },
      { input: "1\n1\n0", expected: "0" }
    ]
  },
  
  // Graphs
  {
    title: "Number of Islands",
    description: "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    difficulty: "Medium",
    tags: ["Graphs", "DFS", "BFS"],
    testCases: [
      { input: "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", expected: "1" },
      { input: "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", expected: "3" }
    ]
  },
  {
    title: "Max Area of Island",
    description: "You are given an `m x n` binary matrix `grid`. An island is a group of `1`'s (representing land) connected 4-directionally (horizontal or vertical.) You may assume all four edges of the grid are surrounded by water.\nThe area of an island is the number of cells with a value `1` in the island.\nReturn the maximum area of an island in `grid`. If there is no island, return `0`.",
    difficulty: "Medium",
    tags: ["Graphs", "DFS", "BFS"],
    testCases: [
      { input: "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", expected: "9" },
      { input: "4 5\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0", expected: "0" }
    ]
  },
  {
    title: "Clone Graph",
    description: "Given a reference of a node in a connected undirected graph.\nReturn a deep copy (clone) of the graph.",
    difficulty: "Medium",
    tags: ["Graphs", "DFS", "BFS"],
    testCases: [
      { input: "[[2,4],[1,3],[2,4],[1,3]]", expected: "[[2,4],[1,3],[2,4],[1,3]]" },
      { input: "[[]]", expected: "[[]]" }
    ]
  }
];

async function seed() {
  console.log("🌱 Starting Database Seed...");
  try {
    for (const prob of problems) {
      // Check if problem already exists
      const existRes = await db.query('SELECT id FROM problems WHERE title = $1', [prob.title]);
      if (existRes.rows.length > 0) {
        console.log(`Problem '${prob.title}' already exists, skipping.`);
        continue;
      }

      // Insert Problem
      const probRes = await db.query(`
        INSERT INTO problems (title, description, difficulty, tags)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [prob.title, prob.description, prob.difficulty, prob.tags]);
      
      const probId = probRes.rows[0].id;
      
      // Insert Test Cases
      for (const tc of prob.testCases) {
        await db.query(`
          INSERT INTO test_cases (problem_id, input_data, expected_output, is_public)
          VALUES ($1, $2, $3, true)
        `, [probId, tc.input, tc.expected]);
      }
      
      console.log(`✅ Inserted: ${prob.title}`);
    }
    console.log("🎉 Seeding complete! Added 30 algorithmic problems.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
