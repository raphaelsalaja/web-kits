module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "audio",
        "blur",
        "motion-blur",
        "react",
        "springboard",
        "web",
        "playground",
        "skills",
        "ci",
        "deps",
        "deps-dev",
        "release",
        "repo",
      ],
    ],
  },
};
