import { SYNC_TASK_MODALS } from '#src/app/main-window/modal-contract.js'

const syncTasks = {
  syncTasks: {
    task: {
      extra: {
        remoteFolderLabel: '映射到',
        lastSyncLabel: '上次同步',
      },
    },
    toolbar: {
      [SYNC_TASK_MODALS.CHOOSE_SERVER]: '创建',
      [SYNC_TASK_MODALS.CREATE_SERVER]: '创建',
      [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: '创建',
      [SYNC_TASK_MODALS.EDIT_SERVER]: '编辑',
      [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: '编辑',
      [SYNC_TASK_MODALS.EDIT_PATTERNS]: '规则',
      [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: '删除',
      [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: '删除',
    },
    modals: {
      common: {
        next: '下一步',
        cancel: '取消',
        confirm: '确认',
        local: '本地',
        remote: '远程',
        changeFolder: '选择文件夹',
      },
      [SYNC_TASK_MODALS.CHOOSE_SERVER]: {
        title: '创建任务',
        message: '选择远程服务器',
      },
      [SYNC_TASK_MODALS.CREATE_SERVER]: {
        title: '创建任务',
        message: '连接到新服务器',
      },
      [SYNC_TASK_MODALS.CREATE_FOLDER_MAPPING]: {
        title: '创建任务',
        message: '映射本地文件夹与远程文件夹',
      },
      [SYNC_TASK_MODALS.EDIT_SERVER]: {
        title: '编辑服务器',
        message: '编辑服务器连接',
      },
      [SYNC_TASK_MODALS.EDIT_FOLDER_MAPPING]: {
        title: '编辑文件夹映射',
        message: '映射本地文件夹与远程文件夹',
      },
      [SYNC_TASK_MODALS.EDIT_PATTERNS]: {
        title: '编辑忽略规则',
        message: '为同步任务设置额外的忽略规则',
        taskSpecificPatterns: {
          title: '任务专用忽略规则',
          description: '同步时，这些规则将与 .ignore 文件一起用于过滤文件。',
        },
        globalPatterns: {
          title: '全局忽略规则',
          description: '可以在设置面板中修改这些规则。',
        },
      },
      [SYNC_TASK_MODALS.CONFIRM_DELETE_SERVER]: {
        title: '删除服务器',
        message: '确认删除此服务器',
      },
      [SYNC_TASK_MODALS.CONFIRM_DELETE_TASK]: {
        title: '删除任务',
        message: '确认删除此同步任务',
      },
    },
  },
}

export default syncTasks
