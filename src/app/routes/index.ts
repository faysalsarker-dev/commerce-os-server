import { Router } from "express"
import authRoute from "../modules/auth/auth.route"
import userRoute from "../modules/user/user.route"

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
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
