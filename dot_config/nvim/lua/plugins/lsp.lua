return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = { eslint = {} },
      inlay_hints = { enabled = false },
      setup = {
        -- eslint = function()
        --   snacks.lsp.on_attach(function(client)
        --     if client.name == "eslint" then
        --       client.server_capabilities.documentFormattingProvider = true
        --     elseif client.name == "vtsls" then
        --       client.server_capabilities.documentFormattingProvider = false
        --     end
        --   end)
        -- end,
      },
    },
  },
}
