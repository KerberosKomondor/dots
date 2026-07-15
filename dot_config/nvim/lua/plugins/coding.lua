return {
  "saghen/blink.cmp",
  dependencies = { "alexandre-abrioux/blink-cmp-npm.nvim" },
  opts = {
    sources = {
      default = {
        -- enable "npm" in your sources list
        "npm",
      },
      providers = {
        -- configure the provider
        npm = {
          name = "npm",
          module = "blink-cmp-npm",
          async = true,
          -- optional - make blink-cmp-npm completions top priority (see `:h blink.cmp`)
          score_offset = 100,
          -- optional - blink-cmp-npm config
          ---@module "blink-cmp-npm"
          ---@type blink-cmp-npm.Options
          opts = {
            ignore = {},
            only_semantic_versions = true,
            only_latest_version = false,
          },
        },
      },
    },
  },
}
