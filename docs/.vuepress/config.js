module.exports = {
    title: 'xFUND Router/OoO Documentation',
    description: 'Welcome to the documentation for xFUND Router/OoO',
    base: '/',
    markdown: {
        // options for markdown-it-toc
        toc: {includeLevel: [2, 3]}
    },

    themeConfig: {
        lastUpdated: 'Last Updated',
        repo: 'unification-com/xfund-router',
        docsDir: 'docs',
        logo: '/assets/img/unification_logoblack.png',
        sidebar: [
            {
                title: "Introduction",
                path: "/"
            },
            {
                title: "Contract Addresses",
                path: "/contracts"
            },
            {
                title: "Provider Addresses",
                path: "/providers"
            },
            {
                title: "Guides",
                path: "/guide",
                children: [
                    "/guide/quickstart",
                    "/guide/implementation",
                    "/guide/interaction",
                    "/guide/ooo_api"
                ]
            },
            {
                title: "Contract Docs",
                children: [
                    "/api/Router",
                    "/api/lib/ConsumerBase",
                    "/api/lib/RequestIdBase",
                    "/api/examples/DemoConsumer",
                ]
            },
        ],
    }
}
