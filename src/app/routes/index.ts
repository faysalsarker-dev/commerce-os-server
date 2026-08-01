import { Router } from "express"
import authRoute from "../modules/auth/auth.route"
import userRoute from "../modules/user/user.route"
import categoryRoute from "../modules/catagory/category.route"
import productRoute from "../modules/product/product.route"
import productInventoryRoute from "../modules/product/product-inventory.route"
import salesRoute from "../modules/sales/sales.route"

export const router = Router()

interface ModuleRoute {
    path: string;
    route: Router;
}

const moduleRoutes: ModuleRoute[] = [
    {
        path: "/auth",
        route: authRoute
    },
    {
        path: "/user",
        route: userRoute
    }
    ,
    {
        path: "/category",
        route: categoryRoute
    },
    {
        path: "/products",
        route: productRoute
    },
    {
        path: "",
        route: productInventoryRoute
    },
    {
        path: "/sales",
        route: salesRoute
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
