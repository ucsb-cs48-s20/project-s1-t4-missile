module.exports = {
    module: {
        rules: [
            {
                test: /\.(css|scss)$/,
                exclude: /\.module\.(css|scss)$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: false,
                        },
                    },
                ],
            },
            {
                test: /\.module\.(css|scss)$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                ],
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {},
                    },
                ],
            },
        ],
    }
};