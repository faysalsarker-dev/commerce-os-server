import { Router } from "express"
import authRoute from "../modules/auth/auth.route"
import userRoute from "../modules/user/user.route"
import categoryRoute from "../modules/catagory/category.route"
import productRoute from "../modules/product/product.route"
import salesRoute from "../modules/sales/sales.route"
import customerRoute from "../modules/customer/customer.route"
import refundRoute from "../modules/refund/refund.route"

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
    },
    {
        path: "/category",
        route: categoryRoute
    },
    {
        path: "/product",
        route: productRoute
    },
    {
        path: "/sales",
        route: salesRoute
    },
    {
        path: "/customer",
        route: customerRoute
    },
    {
        path: "/refund",
        route: refundRoute
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
