const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// Cargar variables de entorno desde .env
require('dotenv').config();

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProduction ? "production" : "development",
  target: "web",

  // ✅ solo tu app principal
  entry: "./src/index.js",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    chunkFilename: "[name].bundle.js",
    publicPath: "/",
    clean: true,
  },

  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      path: require.resolve("path-browserify"),
      process: require.resolve("process/browser"),
      events: require.resolve("events/"),
    },
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : "style-loader",
          "css-loader",
          "postcss-loader",
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico|ttf|woff2?)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext][query]",
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),

    new HtmlWebpackPlugin({
      template: "./src/index.template.html",
      filename: "index.html",
      inject: "body",
      scriptLoading: "defer",
      minify: isProduction
        ? {
            collapseWhitespace: true,
            removeComments: true,
          }
        : false,
    }),

    // Solo usar MiniCssExtractPlugin en producción
    ...(isProduction ? [
      new MiniCssExtractPlugin({
        filename: "main.css",
      })
    ] : []),

    new webpack.DefinePlugin({
      "process.env.REACT_APP_ENV": JSON.stringify("electron"),
      "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
      "process.env.API_URL": JSON.stringify(process.env.API_URL || "http://localhost:3001/api"),
      // Variables de Supabase para el navegador
      "process.env.SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL || ""),
      "process.env.SUPABASE_ANON_KEY": JSON.stringify(process.env.SUPABASE_ANON_KEY || ""),
    }),

    new webpack.ProvidePlugin({
      process: "process/browser",
    }),

    // ✅ Esto evita el error fatal: "global is not defined"
    new webpack.BannerPlugin({
      banner: "var global = globalThis;",
      raw: true,
    }),
  ],

  devtool: isProduction ? false : "source-map",

  devServer: {
    compress: true,
    port: 8083,
    hot: true,
    historyApiFallback: true,
    devMiddleware: {
      writeToDisk: true, // ✅ Escribir archivos en dist/ en desarrollo
    },
  },
};
