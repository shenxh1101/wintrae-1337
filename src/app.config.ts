export default defineAppConfig({
  pages: [
    'pages/tools/index',
    'pages/calendar/index',
    'pages/records/index',
    'pages/return-check/index',
    'pages/notices/index',
    'pages/tool-detail/index',
    'pages/booking/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2E7D5B',
    navigationBarTitleText: '社区共享工具',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7F5',
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#2E7D5B',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/tools/index',
        text: '工具列表',
      },
      {
        pagePath: 'pages/calendar/index',
        text: '预约日历',
      },
      {
        pagePath: 'pages/records/index',
        text: '借用记录',
      },
      {
        pagePath: 'pages/return-check/index',
        text: '归还检查',
      },
      {
        pagePath: 'pages/notices/index',
        text: '公告中心',
      },
    ],
  },
});
