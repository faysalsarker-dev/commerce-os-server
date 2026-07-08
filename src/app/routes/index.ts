import { Router } from "express"
import authRoute from "../modules/auth/auth.route"

export const router = Router()

interface ModuleRoute {
    path: string;
    route: Router;
}

const moduleRoutes: ModuleRoute[] = [
    {
        path: "/auth",
        route: authRoute
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})
