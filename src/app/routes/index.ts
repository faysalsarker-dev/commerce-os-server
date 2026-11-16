import { Router } from "express"
import authRoute from "../modules/auth/auth.route"
import userRoute from "../modules/user/user.route"
import categoryRoute from "../modules/catagory/category.route"
import productRoute from "../modules/product/product.route"
import salesRoute from "../modules/sales/sales.route"
import customerRoute from "../modules/customer/customer.route"
import refundRoute from "../modules/refund/refund.route"
import sizeRoute from "../modules/size/size.route"
import expenseRoute from "../modules/expense/expense.route"
import expenseCategoryRoute from "../modules/expense-category/expense-category.route"
import couponRoute from "../modules/coupon/coupon.route"
import courierIntegrationRoute from "../modules/courier-integration/courier-integration.route"

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
    },
    {
        path: "/size",
        route: sizeRoute
    },
    {
        path: "/expense",
        route: expenseRoute
    },
    {
        path: "/expense-category",
        route: expenseCategoryRoute
    },
    {
        path: "/coupon",
        route: couponRoute
    },
    {
        path: "/courier-accounts",
        route: courierIntegrationRoute
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
