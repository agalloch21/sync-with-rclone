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
    serverForm: {
      name: '名称',
      protocol: '协议',
      selectProtocol: '选择协议类型',
    },
    [FORM_MODAL_VIEW.CHOOSE_SERVER]: {
      title: '选择服务器',
      message: '使用现有服务器或创建新服务器',
      loading: '正在加载服务器……',
      chooseExisting: '从现有服务器中选择',
      noneConfigured: '没有已配置的服务器',
      createNew: '连接到新服务器',
    },
    [FORM_MODAL_VIEW.CREATE_SERVER]: {
      title: '创建服务器',
      message: '填写服务器信息',
    },
    [FORM_MODAL_VIEW.CREATE_FOLDER_MAPPING]: {
      title: '创建映射',
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
      title: '编辑排除规则',
      message: '设置推送和拉取均不参与同步的路径',
      mappingSpecificPatterns: {
        title: '映射排除规则',
        description: '匹配路径在推送和拉取中均不比较、不复制、也不删除；不支持否定规则。',
      },
      globalPatterns: {
        title: '继承的全局排除规则',
        description: '这些规则作用于所有映射，可以在设置中修改。',
      },
    },
  },
}

export default formModal
