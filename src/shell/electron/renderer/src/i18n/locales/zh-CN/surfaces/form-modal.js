import { FORM_MODAL_VIEW } from '#electron/contracts/form-modal.js'

const formModal = {
  formModal: {
    common: {
      next: '下一步',
      cancel: '取消',
      confirm: '确认',
      local: '本地',
      remote: '远程',
      changeFolder: '选择文件夹',
    },
    [FORM_MODAL_VIEW.CHOOSE_SERVER]: {
      title: '创建任务',
      message: '选择远程服务器',
    },
    [FORM_MODAL_VIEW.CREATE_SERVER]: {
      title: '创建任务',
      message: '连接到新服务器',
    },
    [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: {
      title: '创建任务',
      message: '映射本地文件夹与远程文件夹',
    },
    [FORM_MODAL_VIEW.EDIT_SERVER]: {
      title: '编辑服务器',
      message: '编辑服务器连接',
    },
    [FORM_MODAL_VIEW.EDIT_FOLDER_MAPPING]: {
      title: '编辑文件夹映射',
      message: '映射本地文件夹与远程文件夹',
    },
    [FORM_MODAL_VIEW.EDIT_PATTERNS]: {
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
  },
}

export default formModal
