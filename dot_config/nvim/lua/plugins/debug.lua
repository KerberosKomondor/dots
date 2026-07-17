---@diagnostic disable: missing-fields
local IS_MAC = vim.fn.has("mac") == 1

--- Resolve the CRM repo root by searching upward from the current buffer/cwd for its
--- solution file, rather than hardcoding a path — the clone location differs between
--- macOS and WSL (and between machines), so this works unchanged on both.
local function find_crm_root()
  local start = vim.api.nvim_buf_get_name(0)
  start = start ~= "" and vim.fs.dirname(start) or vim.fn.getcwd()
  local found = vim.fs.find("Igs.Crm.sln", { upward = true, path = start })[1]
  if found then
    return vim.fs.dirname(found)
  end
  return vim.fn.getcwd()
end

-- On macOS, ~/.zshrc's Linux/WSL-only DOTNET_ROOT=/usr/share/dotnet (and MSBuildSDKsPath
-- derived from it) can still leak into an inherited shell env and break SDK resolution for
-- net8.0. On Linux/WSL those vars are legitimate and required, so only strip on macOS.
local BUILD_ENV_STRIP_KEYS = {
  "DOTNET_ROOT",
  "MSBuildSDKsPath",
  "DOTNET_RUNTIME_IDENTIFIER",
  "DOTNET_RUNTIME_ID",
}

---@param csproj string absolute path to the .csproj to build first
---@param config table dap.configurations.cs entry to launch once the build succeeds
local function build_and_run(csproj, config)
  vim.notify("Building " .. vim.fn.fnamemodify(csproj, ":t") .. "...", vim.log.levels.INFO)
  local system_opts = { text = true }
  if IS_MAC then
    local env = vim.fn.environ()
    for _, key in ipairs(BUILD_ENV_STRIP_KEYS) do
      env[key] = nil
    end
    system_opts.env = env
    system_opts.clear_env = true
  end
  vim.system({ "dotnet", "build", csproj }, system_opts, function(obj)
    vim.schedule(function()
      if obj.code ~= 0 then
        vim.notify(
          "dotnet build failed for " .. vim.fn.fnamemodify(csproj, ":t") .. "\n" .. (obj.stdout or "") .. (obj.stderr or ""),
          vim.log.levels.ERROR
        )
        return
      end
      vim.notify("Build succeeded, launching " .. config.name, vim.log.levels.INFO)
      require("dap").run(config)
    end)
  end)
end

return {
  {
    "mfussenegger/nvim-dap",
    dependencies = {
      "rcarriga/nvim-dap-ui",
      "nvim-neotest/nvim-nio",
      {
        "jay-babu/mason-nvim-dap.nvim",
        dependencies = "mason.nvim",
        opts = {
          ensure_installed = { "netcoredbg" },
          automatic_installation = true,
        },
      },
    },
    -- stylua: ignore
    keys = {
      { "<leader>db", function() require("dap").toggle_breakpoint() end, desc = "Toggle Breakpoint" },
      { "<leader>dc", function() require("dap").continue() end, desc = "Continue / Start" },
      { "<leader>do", function() require("dap").step_over() end, desc = "Step Over" },
      { "<leader>di", function() require("dap").step_into() end, desc = "Step Into" },
      { "<leader>dO", function() require("dap").step_out() end, desc = "Step Out" },
      { "<leader>dt", function() require("dap").terminate() end, desc = "Terminate" },
      { "<leader>du", function() require("dapui").toggle() end, desc = "Dap UI" },
      {
        "<leader>dcs",
        function()
          local root = find_crm_root()
          build_and_run(
            root .. "/Igs.Crm.Core.Services.Web/Igs.Crm.Core.Services.Web.csproj",
            require("dap").configurations.cs[1]
          )
        end,
        desc = "Build + Debug: Igs.Crm.Core.Services.Web",
      },
      {
        "<leader>dcw",
        function()
          local root = find_crm_root()
          build_and_run(root .. "/Igs.Crm.Web/Igs.Crm.Web.csproj", require("dap").configurations.cs[2])
        end,
        desc = "Build + Debug: Igs.Crm.Web",
      },
    },
    config = function()
      local dap = require("dap")
      local dapui = require("dapui")

      dapui.setup()
      dap.listeners.after.event_initialized["dapui_config"] = function()
        dapui.open()
      end
      dap.listeners.before.event_terminated["dapui_config"] = function()
        dapui.close()
      end
      dap.listeners.before.event_exited["dapui_config"] = function()
        dapui.close()
      end

      -- stdpath("data") is ~/.local/share/nvim on both macOS and Linux/WSL, so the
      -- mason-installed netcoredbg binary is found the same way on either OS.
      dap.adapters.netcoredbg = {
        type = "executable",
        command = vim.fn.stdpath("data") .. "/mason/bin/netcoredbg",
        args = { "--interpreter=vscode" },
      }

      -- CH360-7925: debug ../CRM backends (Igs.Crm.Web + Igs.Crm.Core.Services.Web) from nvim.
      -- program/cwd are functions so the repo root is resolved fresh per-launch (see
      -- find_crm_root) instead of a path hardcoded for one OS/machine.
      -- ports match Properties/launchSettings.json since launching the dll directly skips it
      dap.configurations.cs = {
        {
          type = "netcoredbg",
          name = "Igs.Crm.Core.Services.Web",
          request = "launch",
          program = function()
            return find_crm_root() .. "/Igs.Crm.Core.Services.Web/bin/Debug/net8.0/Igs.Crm.Core.Services.Web.dll"
          end,
          cwd = function()
            return find_crm_root() .. "/Igs.Crm.Core.Services.Web"
          end,
          stopAtEntry = false,
          env = {
            ASPNETCORE_ENVIRONMENT = "Development",
            DOTNET_ENVIRONMENT = "Development",
            ASPNETCORE_URLS = "http://localhost:5048",
          },
        },
        {
          type = "netcoredbg",
          name = "Igs.Crm.Web",
          request = "launch",
          program = function()
            return find_crm_root() .. "/Igs.Crm.Web/bin/Debug/net8.0/Igs.Crm.Web.dll"
          end,
          cwd = function()
            return find_crm_root() .. "/Igs.Crm.Web"
          end,
          stopAtEntry = false,
          env = {
            ASPNETCORE_ENVIRONMENT = "Development",
            ASPNETCORE_URLS = "http://localhost:5050",
          },
        },
      }
    end,
  },
}
