import {ActionMetadata} from "../metadata/ActionMetadata";
import {ControllerMetadata} from "../metadata/ControllerMetadata";
import {InterceptorMetadata} from "../metadata/InterceptorMetadata";
import {MiddlewareMetadata} from "../metadata/MiddlewareMetadata";
import {ParamMetadata} from "../metadata/ParamMetadata";
import { ParamMetadataArgs } from "../metadata/args/ParamMetadataArgs";
import {ResponseHandlerMetadata} from "../metadata/ResponseHandleMetadata";
import { RoutingControllersOptions } from "../RoutingControllersOptions";
import {UseMetadata} from "../metadata/UseMetadata";
import {getMetadataArgsStorage} from "../index";
import { IGetFromContainer } from "../container";

/**
 * Builds metadata from the given metadata arguments.
 */
export class MetadataBuilder {

    constructor(private options: RoutingControllersOptions, private getFromContainer: IGetFromContainer) { }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Builds controller metadata from a registered controller metadata args.
     */
    buildControllerMetadata(classes?: Function[]) {
        return this.createControllers(classes);
    }

    /**
     * Builds middleware metadata from a registered middleware metadata args.
     */
    buildMiddlewareMetadata(classes?: Function[]): MiddlewareMetadata[] {
        return this.createMiddlewares(classes);
    }

    /**
     * Builds interceptor metadata from a registered interceptor metadata args.
     */
    buildInterceptorMetadata(classes?: Function[]): InterceptorMetadata[] {
        return this.createInterceptors(classes);
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates middleware metadatas.
     */
    protected createMiddlewares(classes?: Function[]): MiddlewareMetadata[] {
        const middlewares = !classes ? getMetadataArgsStorage().middlewares : getMetadataArgsStorage().filterMiddlewareMetadatasForClasses(classes);
        return middlewares.map(middlewareArgs => new MiddlewareMetadata(middlewareArgs, this.getFromContainer));
    }

    /**
     * Creates interceptor metadatas.
     */
    protected createInterceptors(classes?: Function[]): InterceptorMetadata[] {
        const interceptors = !classes ? getMetadataArgsStorage().interceptors : getMetadataArgsStorage().filterInterceptorMetadatasForClasses(classes);
        return interceptors.map(interceptorArgs => new InterceptorMetadata({
            target: interceptorArgs.target,
            method: undefined,
            interceptor: interceptorArgs.target
        }));
    }

    /**
     * Creates controller metadatas.
     */
    protected createControllers(classes?: Function[]): ControllerMetadata[] {
        const controllers = !classes ? getMetadataArgsStorage().controllers : getMetadataArgsStorage().filterControllerMetadatasForClasses(classes);
        return controllers.map(controllerArgs => {
            const controller = new ControllerMetadata(controllerArgs, this.getFromContainer);
            controller.build(this.createControllerResponseHandlers(controller));
            controller.actions = this.createActions(controller);
            controller.uses = this.createControllerUses(controller);
            controller.interceptors = this.createControllerInterceptorUses(controller);
            return controller;
        });
    }

    /**
     * Creates action metadatas.
     */
    protected createActions(controller: ControllerMetadata): ActionMetadata[] {
        return getMetadataArgsStorage()
            .filterActionsWithTarget(controller.target)
            .map(actionArgs => {
                const action = new ActionMetadata(controller, actionArgs, this.options);
                action.params = this.createParams(action);
                action.uses = this.createActionUses(action);
                action.interceptors = this.createActionInterceptorUses(action);
                action.build(this.createActionResponseHandlers(action));
                return action;
            });
    }

    /**
     * Creates param metadatas.
     */
    protected createParams(action: ActionMetadata): ParamMetadata[] {
        return getMetadataArgsStorage()
            .filterParamsWithTargetAndMethod(action.target, action.method)
            .map(paramArgs => new ParamMetadata(action, this.decorateDefaultParamOptions(paramArgs)));
    }

    /**
     * Decorate paramArgs with default settings
     */
    private decorateDefaultParamOptions(paramArgs: ParamMetadataArgs) {
        let options = this.options.defaults && this.options.defaults.paramOptions;
        if (!options)
            return paramArgs;
        
        if (paramArgs.required === undefined)
            paramArgs.required = options.required || false;

        return paramArgs;
    }

    /**
     * Creates response handler metadatas for action.
     */
    protected createActionResponseHandlers(action: ActionMetadata): ResponseHandlerMetadata[] {
        return getMetadataArgsStorage()
            .filterResponseHandlersWithTargetAndMethod(action.target, action.method)
            .map(handlerArgs => new ResponseHandlerMetadata(handlerArgs));
    }

    /**
     * Creates response handler metadatas for controller.
     */
    protected createControllerResponseHandlers(controller: ControllerMetadata): ResponseHandlerMetadata[] {
        return getMetadataArgsStorage()
            .filterResponseHandlersWithTarget(controller.target)
            .map(handlerArgs => new ResponseHandlerMetadata(handlerArgs));
    }

    /**
     * Creates use metadatas for actions.
     */
    protected createActionUses(action: ActionMetadata): UseMetadata[] {
        return getMetadataArgsStorage()
            .filterUsesWithTargetAndMethod(action.target, action.method)
            .map(useArgs => new UseMetadata(useArgs));
    }

    /**
     * Creates use interceptors for actions.
     */
    protected createActionInterceptorUses(action: ActionMetadata): InterceptorMetadata[] {
        return getMetadataArgsStorage()
            .filterInterceptorUsesWithTargetAndMethod(action.target, action.method)
            .map(useArgs => new InterceptorMetadata(useArgs));
    }

    /**
     * Creates use metadatas for controllers.
     */
    protected createControllerUses(controller: ControllerMetadata): UseMetadata[] {
        return getMetadataArgsStorage()
            .filterUsesWithTargetAndMethod(controller.target, undefined)
            .map(useArgs => new UseMetadata(useArgs));
    }

    /**
     * Creates use interceptors for controllers.
     */
    protected createControllerInterceptorUses(controller: ControllerMetadata): InterceptorMetadata[] {
        return getMetadataArgsStorage()
            .filterInterceptorUsesWithTargetAndMethod(controller.target, undefined)
            .map(useArgs => new InterceptorMetadata(useArgs));
    }

}
