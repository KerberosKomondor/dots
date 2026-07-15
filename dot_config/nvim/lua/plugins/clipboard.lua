return {
  "swaits/universal-clipboard.nvim",
  opts = {
    verbose = false, -- optional: set true to log detection details
    tools = {
      {
        name = "WslClipboard",
        detect = function()
          return vim.fn.executable("clip.exe") == 1
            and vim.fn.executable("powershell.exe") == 1
            and os.getenv("WSL_DISTRO_NAME") ~= nil
        end,
        commands = {
          copy = "clip.exe",
          paste = 'powershell.exe -NoLogo -NoProfile -c [Console]::Out.Write($(Get-Clipboard -Raw).tostring().replace("`r", ""))',
        },
      },
    },
  },
}
