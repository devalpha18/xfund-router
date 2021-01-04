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
                title: "Home",
                children: ["/"],
            },
            {
                title: "Guides",
                path: "/guide",
                children: [
                    "/guide/quickstart",
                    {
                        title: "Complete Deployment Guide",
                        children: [
                            "/guide/implementation",
                            "/guide/interaction",
                            "/guide/ooo_api"
                        ]
                    }
                ]
            },
            {
                title: "Contract APIs",
                children: [
                    "/api/Router",
                    "/api/lib/ConsumerLib",
                    "/api/lib/Consumer",
                ]
            },
        ],
    }
}
