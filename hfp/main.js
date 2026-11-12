function handle(event) {
    if (event.action !== "page") return { command: event.action };
    const state = event.state || {};
    const running = state.serviceRunning === true;
    return {
        title: "手环校园卡",
        refreshOnReturn: "page",
        status: {
            icon: "band", active: running,
            title: running ? "连接服务已开启" : "连接服务已关闭",
            detail: running ? state.status : "通过运动健康连接手环"
        },
        rows: [
            running
                ? { title: "在手环上打开校园卡", icon: "band", event: "open", primary: true }
                : { title: "启用手环连接", icon: "band", event: "connect", primary: true },
            ...(running ? [
                { section: "连接管理", title: "重新连接", detail: "运动健康需保持连接", icon: "refresh", event: "connect" }
            ] : []),
            ...(running ? [{ title: "停止手环连接", icon: "power", event: "stop", danger: true }] : []),
            { section: "显示", title: "余额显示", detail: state.balanceEnabled === true ? "已开启" : "已关闭", icon: "wallet", event: "balance" }
        ]
    };
}
