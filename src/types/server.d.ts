import { Elysia } from 'elysia';
declare const app: Elysia<"", {
    decorator: {
        tenantService: import("./v1/tenants/services/tenant.service").TenantService;
    } & {
        firsService: import("./@lib/adapters/firs/firs.service").FIRSService;
    } & {
        authService: import("./v1/auth/services").AuthService;
    } & {
        teamMemberService: import("./v1/tenants/services/team-member.service").TeamMemberService;
    } & Partial<{}> & {
        webhookService: import("./v1/webhook/services/webhook.service").WebhookService;
    } & {
        teamService: import("./v1/tenants/services/team-member.service").TeamMemberService;
    } & {
        configService: import("./v1/admin").SystemConfigService;
    } & {
        transformWorkflowService: import("./v1/workflow/services").TransformWorkflowService;
    } & {
        llmService: import("./@lib/adapters/llm/llm.service").LLMService;
    } & {
        invoiceWorkflowService: import("./v1/invoicing/services").InvoiceWorkflowService;
    } & {
        outboundWorkflowService: import("./v1/workflow/services").OutboundWorkflowService;
    } & {
        inboundWorkflowService: import("./v1/workflow/services").InboundWorkflowService;
    } & {
        outboundRepo: import("./v1/workflow/repos/outbound-invoice.repo").OutboundInvoiceRepository;
    } & {
        inboundRepo: import("./v1/workflow/repos/inbound-invoice.repo").InboundInvoiceRepository;
    } & {
        auditRepo: import("./v1/audit/repos/audit-log.repo").AuditLogRepository;
    } & {
        webhookEventRepo: import("./v1/webhook/repos/webhook-event.repo").WebhookEventRepository;
    } & {
        outboundService: import("./v1/workflow/services").OutboundWorkflowService;
    };
    store: {};
    derive: Partial<{}>;
    resolve: Partial<{}>;
}, {
    typebox: {};
    error: {};
} & {
    typebox: import("@sinclair/typebox").TModule<{}>;
    error: {};
} & {
    typebox: {};
    error: {};
} & {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
} & {
    schema: {};
    macro: {};
    macroFn: {};
    parser: {};
} & {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
} & {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    [x: string]: {
        get: {
            body: unknown;
            params: {};
            query: unknown;
            headers: unknown;
            response: {
                200: string;
            };
        };
    };
} & {
    v1: {};
} & {
    v1: {
        auth: {
            post: {
                body: {
                    email: string;
                    password: string;
                };
                params: {};
                query: unknown;
                headers: unknown;
                response: {
                    200: {
                        success: boolean;
                        message: string;
                        data: {
                            token: string;
                            tokenType: string;
                            expiresIn: string;
                            tenant: {
                                id: string;
                                businessName: string;
                                email: string;
                                status: import("./v1/tenants/models").TenantStatus;
                            };
                        };
                        error?: undefined;
                        statusCode?: undefined;
                    } | {
                        success: boolean;
                        error: any;
                        statusCode: any;
                        message?: undefined;
                        data?: undefined;
                    };
                    422: {
                        type: "validation";
                        on: string;
                        summary?: string;
                        message?: string;
                        found?: unknown;
                        property?: string;
                        expected?: string;
                    };
                };
            };
        } & {
            "team-member": {
                post: {
                    body: {
                        email: string;
                        password: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            data: {
                                token: string;
                                tokenType: string;
                                expiresIn: string;
                                user: {
                                    userId: string;
                                    tenantId: string;
                                    email: string;
                                    firstName: string;
                                    lastName: string;
                                    role: import("./v1/tenants/models").TeamMemberRole;
                                };
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            oauth: {
                firs: {
                    post: {
                        body: {
                            mock?: boolean | undefined;
                            email: string;
                            password: string;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    business: {
                                        id: string;
                                        name: string;
                                        tin: string;
                                        sector: string;
                                        erpSystem: string;
                                        irnTemplate: string;
                                        isActive: boolean;
                                    };
                                    token: string;
                                    tenantExists: boolean;
                                    tenantId: string;
                                    message: string;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            "forgot-password": {
                post: {
                    body: {
                        email: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            "reset-password": {
                post: {
                    body: {
                        password: string;
                        token: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            "validate-reset-token": {
                ":token": {
                    get: {
                        body: unknown;
                        params: {
                            token: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    valid: boolean;
                                    email: string | undefined;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        auth: {
            me: {
                get: {
                    body: unknown;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: {
                                type: string;
                                userId: string;
                                tenantId: string;
                                email: string;
                                firstName: string;
                                lastName: string;
                                role: import("./v1/tenants/models").TeamMemberRole;
                                status: import("./v1/tenants/models").TeamMemberStatus;
                                permissions: string[];
                                lastLoginAt: Date | undefined;
                                tenant: {
                                    id: string;
                                    businessName: string;
                                    status: import("./v1/tenants/models").TenantStatus;
                                };
                                id?: undefined;
                                businessName?: undefined;
                                tin?: undefined;
                                contactEmail?: undefined;
                                contactPhone?: undefined;
                                erpSystem?: undefined;
                                createdAt?: undefined;
                                config?: undefined;
                                onboarding?: undefined;
                                metadata?: undefined;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            data: {
                                type: string;
                                id: string;
                                businessName: string;
                                tin: any;
                                contactEmail: string;
                                contactPhone: string;
                                erpSystem: any;
                                status: import("./v1/tenants/models").TenantStatus;
                                createdAt: Date;
                                config: {
                                    firs: {
                                        serviceId: any;
                                        clientId: any;
                                        publicKey: any;
                                    };
                                    features: any;
                                    limits: any;
                                    webhookUrl: any;
                                    webhookEnabled: any;
                                    invoiceIdKey: any;
                                };
                                onboarding: {
                                    status: import("./v1/tenants/models").OnboardingStatus;
                                    progress: number;
                                    steps: import("./v1/tenants/models").IOnboardingSteps;
                                    approvedAt: Date | undefined;
                                } | null;
                                metadata: {
                                    [x: string]: any;
                                };
                                userId?: undefined;
                                tenantId?: undefined;
                                email?: undefined;
                                firstName?: undefined;
                                lastName?: undefined;
                                role?: undefined;
                                permissions?: undefined;
                                lastLoginAt?: undefined;
                                tenant?: undefined;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                    };
                };
            };
        } & {
            "set-password": {
                post: {
                    body: {
                        password: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            data: {
                                token: string;
                                tokenType: string;
                                expiresIn: string;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            refresh: {
                post: {
                    body: unknown;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            data: {
                                token: string;
                                tokenType: string;
                                expiresIn: string;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                            data?: undefined;
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        tenants: {
            post: {
                body: {
                    expectedVolume?: number | undefined;
                    businessName: string;
                    tin: string;
                    businessRegistrationNumber: string;
                    contactEmail: string;
                    contactPhone: string;
                    erpSystem: string;
                };
                params: {};
                query: unknown;
                headers: unknown;
                response: {
                    200: {
                        success: boolean;
                        message: string;
                        data: import("./v1/tenants/models").TenantDocument;
                        error?: undefined;
                        statusCode?: undefined;
                    } | {
                        success: boolean;
                        error: any;
                        statusCode: any;
                        message?: undefined;
                        data?: undefined;
                    };
                    422: {
                        type: "validation";
                        on: string;
                        summary?: string;
                        message?: string;
                        found?: unknown;
                        property?: string;
                        expected?: string;
                    };
                };
            };
        } & {
            get: {
                body: unknown;
                params: {};
                query: {
                    status?: "active" | "suspended" | "inactive" | undefined;
                    page?: number | undefined;
                    limit?: number | undefined;
                    onboarding?: boolean | undefined;
                    search?: string | undefined;
                    sortBy?: string | undefined;
                    sortOrder?: "asc" | "desc" | undefined;
                };
                headers: unknown;
                response: {
                    200: {
                        success: boolean;
                        data: (import("./v1/tenants/models").TenantDocument & {
                            onboarding?: any;
                        })[];
                        pagination: {
                            page: number;
                            limit: number;
                            total: number;
                            totalPages: number;
                        };
                        error?: undefined;
                        statusCode?: undefined;
                    } | {
                        success: boolean;
                        error: any;
                        statusCode: any;
                        data?: undefined;
                        pagination?: undefined;
                    };
                    422: {
                        type: "validation";
                        on: string;
                        summary?: string;
                        message?: string;
                        found?: unknown;
                        property?: string;
                        expected?: string;
                    };
                };
            };
        } & {
            ":tenantId": {
                get: {
                    body: unknown;
                    params: {
                        tenantId: string;
                    };
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: import("./v1/tenants/models").TenantDocument & {
                                onboarding?: any;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                patch: {
                    body: {
                        businessName?: string | undefined;
                        contactEmail?: string | undefined;
                        contactPhone?: string | undefined;
                        erpSystem?: string | undefined;
                        webhookUrl?: string | undefined;
                        webhookEnabled?: boolean | undefined;
                        features?: {
                            autoFix?: boolean | undefined;
                            maxRetries?: number | undefined;
                            qrCodeGeneration?: boolean | undefined;
                        } | undefined;
                        limits?: {
                            monthlyInvoiceLimit?: number | undefined;
                            apiRateLimit?: number | undefined;
                        } | undefined;
                        metadata?: any;
                    };
                    params: {
                        tenantId: string;
                    };
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            data: import("./v1/tenants/models").TenantDocument;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                activate: {
                    post: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: import("./v1/tenants/models").TenantDocument;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                suspend: {
                    post: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: import("./v1/tenants/models").TenantDocument;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                delete: {
                    body: unknown;
                    params: {
                        tenantId: string;
                    };
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            message: string;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            message?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                onboarding: {
                    patch: {
                        body: {
                            status?: "active" | "pending" | "in_progress" | "testing" | "rejected" | undefined;
                            notes?: string | undefined;
                            rejectionReason?: string | undefined;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: import("./v1/tenants/models").TenantOnboardingDocument;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "api-keys": {
                    post: {
                        body: {
                            scopes?: string[] | undefined;
                            expiresInDays?: number | undefined;
                            name: string;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    key: string;
                                    tenantId: string;
                                    keyHash: string;
                                    keyPrefix: string;
                                    name: string;
                                    description?: string;
                                    status: import("./v1/tenants/models").ApiKeyStatus;
                                    scopes: string[];
                                    lastUsedAt?: Date;
                                    usageCount: number;
                                    expiresAt?: Date;
                                    createdAt: Date;
                                    updatedAt: Date;
                                    revokedAt?: Date;
                                    revokedBy?: string;
                                    revokedReason?: string;
                                    _id: import("mongoose").Types.ObjectId;
                                    $locals: Record<string, unknown>;
                                    $op: "save" | "validate" | "remove" | null;
                                    $where: Record<string, unknown>;
                                    baseModelName?: string;
                                    collection: import("mongoose").Collection;
                                    db: import("mongoose").Connection;
                                    errors?: import("mongoose").Error.ValidationError;
                                    isNew: boolean;
                                    schema: import("mongoose").Schema;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "api-keys": {
                    get: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    data: import("./v1/tenants/models").ApiKeyDocument[];
                                    meta: any;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "api-keys": {
                    ":keyId": {
                        delete: {
                            body: {
                                reason?: string | undefined;
                            };
                            params: {
                                tenantId: string;
                                keyId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "api-keys": {
                    ":keyId": {
                        rotate: {
                            post: {
                                body: {
                                    reason?: string | undefined;
                                    sendEmail?: boolean | undefined;
                                };
                                params: {
                                    tenantId: string;
                                    keyId: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        message: string;
                                        data: {
                                            key: string;
                                            emailSent: boolean;
                                            tenantId: string;
                                            keyHash: string;
                                            keyPrefix: string;
                                            name: string;
                                            description?: string;
                                            status: import("./v1/tenants/models").ApiKeyStatus;
                                            scopes: string[];
                                            lastUsedAt?: Date;
                                            usageCount: number;
                                            expiresAt?: Date;
                                            createdAt: Date;
                                            updatedAt: Date;
                                            revokedAt?: Date;
                                            revokedBy?: string;
                                            revokedReason?: string;
                                            _id: import("mongoose").Types.ObjectId;
                                            $locals: Record<string, unknown>;
                                            $op: "save" | "validate" | "remove" | null;
                                            $where: Record<string, unknown>;
                                            baseModelName?: string;
                                            collection: import("mongoose").Collection;
                                            db: import("mongoose").Connection;
                                            errors?: import("mongoose").Error.ValidationError;
                                            isNew: boolean;
                                            schema: import("mongoose").Schema;
                                        };
                                        error?: undefined;
                                        statusCode?: undefined;
                                    } | {
                                        success: boolean;
                                        error: any;
                                        statusCode: any;
                                        message?: undefined;
                                        data?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            "api-keys": {
                get: {
                    body: unknown;
                    params: {};
                    query: {
                        status?: string | undefined;
                        tenantId?: string | undefined;
                        page?: number | undefined;
                        limit?: number | undefined;
                    };
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: {
                                keyId: string;
                                tenantId: string;
                                businessName: string;
                                contactEmail: string;
                                tenantStatus: string;
                                keyName: string;
                                keyPrefix: string;
                                status: string;
                                scopes: string[];
                                createdAt: Date;
                                expiresAt?: Date;
                                lastUsedAt?: Date;
                                usageCount: number;
                            }[];
                            pagination: {
                                page: number;
                                limit: number;
                                total: number;
                                totalPages: number;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                            pagination?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            "erp-configs": {
                get: {
                    body: unknown;
                    params: {};
                    query: {
                        erpSystem?: string | undefined;
                        page?: number | undefined;
                        limit?: number | undefined;
                        enabled?: string | undefined;
                    };
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: {
                                tenantId: string;
                                businessName: string;
                                contactEmail: string;
                                status: string;
                                erpSystem?: string;
                                erpSyncConfig?: any;
                                configuredAt?: Date;
                            }[];
                            pagination: {
                                page: number;
                                limit: number;
                                total: number;
                                totalPages: number;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                            pagination?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "erp-sync": {
                    put: {
                        body: {
                            headers?: {} | undefined;
                            description?: string | undefined;
                            queryParams?: {} | undefined;
                            bodyTemplate?: string | undefined;
                            authentication?: {
                                password?: string | undefined;
                                token?: string | undefined;
                                username?: string | undefined;
                                apiKeyName?: string | undefined;
                                apiKeyValue?: string | undefined;
                                apiKeyLocation?: "query" | "header" | undefined;
                                type: "oauth2" | "bearer" | "none" | "basic" | "api-key";
                            } | undefined;
                            timeout?: number | undefined;
                            retryConfig?: {
                                retryOn?: number[] | undefined;
                                maxRetries: number;
                                retryDelay: number;
                            } | undefined;
                            responseMapping?: {} | undefined;
                            triggerEvents?: ("invoice.validated" | "invoice.signed" | "invoice.transmitted" | "invoice.received" | "invoice.acknowledged")[] | undefined;
                            name: string;
                            enabled: boolean;
                            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
                            baseUrl: string;
                            endpoint: string;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    tenantId: string;
                                    configName: string;
                                    enabled: boolean;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "erp-sync": {
                    get: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: import("./v1/tenants/services/tenant.service").ERPSyncConfigInput;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        tenants: {
            ":tenantId": {
                "firs-credentials": {
                    put: {
                        body: {
                            certificate: string;
                            publicKey: string;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    tenantId: string;
                                    firsCredentialsConfigured: boolean;
                                    onboardingStepCompleted: string;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                onboarding: {
                    get: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    onboarding: import("./v1/tenants/models").TenantOnboardingDocument;
                                    progress: number;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        tenants: {
            activate: {
                ":token": {
                    get: {
                        body: unknown;
                        params: {
                            token: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    tenantId: string;
                                    alreadyActivated: boolean;
                                    businessName?: undefined;
                                    email?: undefined;
                                    setPasswordToken?: undefined;
                                    redirectUrl?: undefined;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                message: string;
                                data: {
                                    tenantId: string;
                                    businessName: string;
                                    email: string;
                                    setPasswordToken: string;
                                    redirectUrl: string;
                                    alreadyActivated?: undefined;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        tenants: {
            ":tenantId": {
                credentials: {
                    put: {
                        body: {
                            certificate: string;
                            publicKey: string;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    tenantId: string;
                                    hasCredentials: boolean;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                webhook: {
                    generate: {
                        post: {
                            body: Partial<{
                                invoiceIdKey?: string | undefined;
                            }> | null;
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    data: {
                                        webhookUrl: string;
                                        webhookSecret: string;
                                        webhookPath: string;
                                        invoiceIdKey: string | null;
                                        instructions: string;
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                "invoice-id-key": {
                    put: {
                        body: Partial<{
                            invoiceIdKey: string;
                        }> | null;
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    invoiceIdKey: string | null;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                webhook: {
                    test: {
                        post: {
                            body: Partial<{
                                testPayload?: {} | undefined;
                            }> | null;
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    data: {
                                        webhookUrl: any;
                                        testResult: any;
                                        payload: {};
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    } & {
        tenants: {
            ":tenantId": {
                team: {};
            };
        } & {
            ":tenantId": {
                team: {
                    get: {
                        body: unknown;
                        params: {
                            tenantId: string;
                        };
                        query: {
                            status?: string | undefined;
                            page?: string | undefined;
                            limit?: string | undefined;
                            role?: string | undefined;
                        };
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    userId: string;
                                    email: string;
                                    firstName: string;
                                    lastName: string;
                                    role: import("./v1/tenants/models").TeamMemberRole;
                                    status: import("./v1/tenants/models").TeamMemberStatus;
                                    invitedAt: Date;
                                    acceptedAt: Date | undefined;
                                    permissions: string[];
                                }[];
                                pagination: any;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                                pagination?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                team: {
                    post: {
                        body: {
                            permissions?: string[] | undefined;
                            email: string;
                            role: "member" | "admin" | "viewer";
                            firstName: string;
                            lastName: string;
                        };
                        params: {
                            tenantId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    userId: string;
                                    email: string;
                                    firstName: string;
                                    lastName: string;
                                    role: import("./v1/tenants/models").TeamMemberRole;
                                    status: import("./v1/tenants/models").TeamMemberStatus;
                                    invitedAt: Date;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                team: {
                    ":userId": {
                        get: {
                            body: unknown;
                            params: {
                                userId: string;
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        userId: string;
                                        email: string;
                                        firstName: string;
                                        lastName: string;
                                        role: import("./v1/tenants/models").TeamMemberRole;
                                        status: import("./v1/tenants/models").TeamMemberStatus;
                                        invitedAt: Date;
                                        invitedBy: string;
                                        acceptedAt: Date | undefined;
                                        permissions: string[];
                                        lastLoginAt: Date | undefined;
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                team: {
                    ":userId": {
                        patch: {
                            body: {
                                status?: "active" | "suspended" | undefined;
                                role?: "member" | "admin" | "viewer" | undefined;
                                firstName?: string | undefined;
                                lastName?: string | undefined;
                                permissions?: string[] | undefined;
                            };
                            params: {
                                userId: string;
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    data: {
                                        userId: string;
                                        email: string;
                                        firstName: string;
                                        lastName: string;
                                        role: import("./v1/tenants/models").TeamMemberRole;
                                        status: import("./v1/tenants/models").TeamMemberStatus;
                                        permissions: string[];
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                team: {
                    ":userId": {
                        delete: {
                            body: unknown;
                            params: {
                                userId: string;
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                team: {
                    ":userId": {
                        "resend-invite": {
                            post: {
                                body: unknown;
                                params: {
                                    userId: string;
                                    tenantId: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        message: string;
                                        error?: undefined;
                                        statusCode?: undefined;
                                    } | {
                                        success: boolean;
                                        error: any;
                                        statusCode: any;
                                        message?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    } & {
        tenants: {
            ":tenantId": {
                settings: {};
            };
        } & {
            ":tenantId": {
                settings: {
                    business: {
                        get: {
                            body: unknown;
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        businessName: string;
                                        tin: string;
                                        businessRegistrationNumber: string;
                                        contactEmail: string;
                                        contactPhone: string;
                                        erpSystem: string | undefined;
                                        expectedVolume: Number;
                                        address: any;
                                        website: any;
                                        industry: any;
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            ":tenantId": {
                settings: {
                    business: {
                        put: {
                            body: {
                                businessName?: string | undefined;
                                contactEmail?: string | undefined;
                                contactPhone?: string | undefined;
                                address?: {
                                    street?: string | undefined;
                                    city?: string | undefined;
                                    state?: string | undefined;
                                    country?: string | undefined;
                                    postalCode?: string | undefined;
                                } | undefined;
                                website?: string | undefined;
                                industry?: string | undefined;
                            };
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                    data: {
                                        businessName: string;
                                        tin: string;
                                        businessRegistrationNumber: string;
                                        contactEmail: string;
                                        contactPhone: string;
                                        address: any;
                                        website: any;
                                        industry: any;
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    message?: undefined;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        team: {
            "accept-invite": {
                ":token": {
                    post: {
                        body: {
                            password: string;
                        };
                        params: {
                            token: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                message: string;
                                data: {
                                    userId: string;
                                    email: string;
                                    firstName: string;
                                    lastName: string;
                                    role: import("./v1/tenants/models").TeamMemberRole;
                                    token: string;
                                    tokenType: string;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                message?: undefined;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        admin: {
            config: {
                "firs-dictionary": {};
            };
        } & {
            config: {
                "firs-dictionary": {
                    get: {
                        body: unknown;
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                schema: null;
                                version: number;
                                message: string;
                                success?: undefined;
                                data?: undefined;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                data: import("./v1/workflow/models").InvoiceSchemaDictionaryDocument;
                                schema?: undefined;
                                version?: undefined;
                                message?: undefined;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                schema?: undefined;
                                version?: undefined;
                                message?: undefined;
                                data?: undefined;
                            };
                        };
                    };
                };
            };
        } & {
            config: {
                "firs-dictionary": {
                    put: {
                        body: {
                            metadata?: any;
                            invoice: any;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    schema_id: string;
                                    name: string;
                                    fields_count: any;
                                    fields: any;
                                    status: import("./v1/workflow/models").SchemaStatus;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        admin: {
            config: {
                "supported-erps": {};
            };
        } & {
            config: {
                "supported-erps": {
                    get: {
                        body: unknown;
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                data: {
                                    status: string;
                                    id: string;
                                    source_type: string;
                                    last_updated: Date;
                                }[];
                                success: true;
                                count: number;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                            500: {
                                error: string;
                                success: false;
                                statusCode: number;
                            };
                        };
                    };
                };
            };
        } & {
            config: {
                "supported-erps": {
                    ":erpType": {
                        get: {
                            body: unknown;
                            params: {
                                erpType: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: import("./v1/workflow/models").InvoiceSchemaDictionaryDocument;
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            config: {
                "supported-erps": {
                    post: {
                        body: {
                            metadata?: any;
                            invoice: any;
                            erp: string;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    schema_id: string;
                                    erp_type: any;
                                    fields_count: any;
                                    fields: any;
                                    status: import("./v1/workflow/models").SchemaStatus;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        admin: {
            sandbox: {};
        } & {
            sandbox: {
                "test-transform": {
                    post: {
                        body: {
                            invoice: any;
                            erpType: string;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    transformed: any;
                                    original: any;
                                };
                                errors: string[] | undefined;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                                errors?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            sandbox: {
                "test-validate": {
                    post: {
                        body: {
                            invoice: any;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    valid: boolean;
                                    errors: string[] | undefined;
                                    warnings: string[] | undefined;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            sandbox: {
                "test-full": {
                    post: {
                        body: {
                            invoice: any;
                            erpType: string;
                        };
                        params: {};
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    original: any;
                                    transformed: any;
                                    validation: {
                                        valid: boolean;
                                        errors?: string[];
                                    };
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        admin: {
            config: {
                reference: {
                    events: {
                        get: {
                            body: unknown;
                            params: {};
                            query: {
                                category?: "payment" | "erp" | "all" | "lifecycle" | "system" | "reporting" | undefined;
                                direction?: "all" | "inbound" | "outbound" | "both" | undefined;
                            };
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        events: ({
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_CREATED;
                                            readonly name: "Invoice Created";
                                            readonly category: "lifecycle";
                                            readonly direction: "outbound";
                                            readonly description: "A new invoice has been created in the system.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_VALIDATED;
                                            readonly name: "Invoice Validated";
                                            readonly category: "lifecycle";
                                            readonly direction: "outbound";
                                            readonly description: "Invoice has passed schema and business rule validation.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_SIGNED;
                                            readonly name: "Invoice Signed";
                                            readonly category: "lifecycle";
                                            readonly direction: "outbound";
                                            readonly description: "Invoice has been digitally signed.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_TRANSMITTED;
                                            readonly name: "Invoice Transmitted";
                                            readonly category: "lifecycle";
                                            readonly direction: "outbound";
                                            readonly description: "Invoice has been transmitted to FIRS.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_DELIVERED;
                                            readonly name: "Invoice Delivered";
                                            readonly category: "lifecycle";
                                            readonly direction: "outbound";
                                            readonly description: "Invoice successfully delivered and acknowledged by FIRS.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_FAILED;
                                            readonly name: "Invoice Failed";
                                            readonly category: "lifecycle";
                                            readonly direction: "both";
                                            readonly description: "Invoice processing failed at any stage.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_RECEIVED;
                                            readonly name: "Invoice Received";
                                            readonly category: "lifecycle";
                                            readonly direction: "inbound";
                                            readonly description: "An inbound invoice has been received from an external system.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_ACKNOWLEDGED;
                                            readonly name: "Invoice Acknowledged";
                                            readonly category: "lifecycle";
                                            readonly direction: "inbound";
                                            readonly description: "Inbound invoice has been acknowledged.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_PAID;
                                            readonly name: "Invoice Paid";
                                            readonly category: "payment";
                                            readonly direction: "both";
                                            readonly description: "Payment has been confirmed for the invoice.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_REJECTED;
                                            readonly name: "Invoice Rejected";
                                            readonly category: "lifecycle";
                                            readonly direction: "both";
                                            readonly description: "Invoice was rejected by FIRS or the receiving party.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.INVOICE_CANCELED;
                                            readonly name: "Invoice Canceled";
                                            readonly category: "lifecycle";
                                            readonly direction: "both";
                                            readonly description: "Invoice has been canceled.";
                                        } | {
                                            readonly id: import("./v1/webhook/models").WebhookEventType.TEST_EVENT;
                                            readonly name: "Test Event";
                                            readonly category: "system";
                                            readonly direction: "both";
                                            readonly description: "A test event used to verify webhook connectivity.";
                                        } | {
                                            readonly id: "erp.invoice.created";
                                            readonly name: "<TMP> ERP Invoice Created";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "Invoice created from ERP system into the middleware.";
                                        } | {
                                            readonly id: "erp.invoice.submitted";
                                            readonly name: "ERP Invoice Submitted";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "Invoice submitted from ERP system into the middleware.";
                                        } | {
                                            readonly id: "erp.invoice.updated";
                                            readonly name: "ERP Invoice Updated";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "An existing invoice was updated in the ERP.";
                                        } | {
                                            readonly id: "erp.invoice.voided";
                                            readonly name: "ERP Invoice Voided";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "Invoice has been voided in the ERP.";
                                        } | {
                                            readonly id: "erp.payment.received";
                                            readonly name: "ERP Payment Received";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "Payment recorded for an invoice in the ERP.";
                                        } | {
                                            readonly id: "erp.creditnote.issued";
                                            readonly name: "ERP Credit Note Issued";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "A credit note was issued from the ERP.";
                                        } | {
                                            readonly id: "erp.debitnote.issued";
                                            readonly name: "ERP Debit Note Issued";
                                            readonly category: "erp";
                                            readonly direction: "inbound";
                                            readonly description: "A debit note was issued from the ERP.";
                                        })[];
                                        total: number;
                                    };
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            config: {
                reference: {
                    "workflow-actions": {
                        get: {
                            body: unknown;
                            params: {};
                            query: {
                                category?: "all" | "reporting" | "inbound" | "outbound" | undefined;
                            };
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        actions: ({
                                            readonly id: "generate_irn";
                                            readonly name: "Generate IRN";
                                            readonly order: 1;
                                            readonly category: "outbound";
                                            readonly description: "Generate an Invoice Reference Number (IRN) for the invoice.";
                                            readonly endpoint: "POST /api/v1/workflow/irn/generate";
                                        } | {
                                            readonly id: "transform";
                                            readonly name: "Transform";
                                            readonly order: 2;
                                            readonly category: "outbound";
                                            readonly description: "Transform the ERP invoice payload into FIRS UBL format.";
                                            readonly endpoint: "POST /api/v1/workflow/transform";
                                        } | {
                                            readonly id: "validate";
                                            readonly name: "Validate";
                                            readonly order: 3;
                                            readonly category: "outbound";
                                            readonly description: "Validate the transformed invoice against FIRS schema and business rules.";
                                            readonly endpoint: "POST /api/v1/workflow/validate";
                                        } | {
                                            readonly id: "sign";
                                            readonly name: "Sign";
                                            readonly order: 4;
                                            readonly category: "outbound";
                                            readonly description: "Digitally sign the validated invoice using tenant FIRS credentials.";
                                            readonly endpoint: "POST /api/v1/workflow/sign";
                                        } | {
                                            readonly id: "transmit";
                                            readonly name: "Transmit";
                                            readonly order: 5;
                                            readonly category: "outbound";
                                            readonly description: "Transmit the signed invoice to the FIRS API.";
                                            readonly endpoint: "POST /api/v1/workflow/transmit";
                                        } | {
                                            readonly id: "complete_outbound";
                                            readonly name: "Complete Outbound Flow";
                                            readonly order: 6;
                                            readonly category: "outbound";
                                            readonly description: "Execute the full outbound pipeline: Transform → Validate → Sign → Transmit in one call.";
                                            readonly endpoint: "POST /api/v1/workflow/outbound";
                                        } | {
                                            readonly id: "complete_inbound";
                                            readonly name: "Complete Inbound Flow";
                                            readonly order: 7;
                                            readonly category: "inbound";
                                            readonly description: "Execute the full inbound pipeline: receive, validate, and acknowledge an inbound invoice.";
                                            readonly endpoint: "POST /api/v1/workflow/inbound";
                                        } | {
                                            readonly id: "report_vat";
                                            readonly name: "Report VAT";
                                            readonly order: 8;
                                            readonly category: "reporting";
                                            readonly description: "Submit VAT report for the invoice or reporting period to FIRS.";
                                            readonly endpoint: "POST /api/v1/workflow/vat-report";
                                        } | {
                                            readonly id: "confirm_invoice_status";
                                            readonly name: "Confirm Invoice Status";
                                            readonly order: 9;
                                            readonly category: "reporting";
                                            readonly description: "Query FIRS to confirm the current status of a transmitted invoice.";
                                            readonly endpoint: "GET /api/v1/workflow/status/:irn";
                                        } | {
                                            readonly id: "update_payment_status";
                                            readonly name: "Update Payment Status";
                                            readonly order: 10;
                                            readonly category: "reporting";
                                            readonly description: "Submit VAT post-payment report to FIRS after payment is recorded on a DELIVERED invoice.";
                                            readonly endpoint: "PATCH /api/v1/workflow/invoices/outbound/:irn/payment-status";
                                        } | {
                                            readonly id: "sync_erp";
                                            readonly name: "Sync to ERP";
                                            readonly order: 11;
                                            readonly category: "outbound";
                                            readonly description: "Push processed invoice data back to the tenant ERP using the configured sync endpoint and Handlebars body template.";
                                            readonly endpoint: "POST /api/v1/workflow/erp-sync";
                                        })[];
                                        total: number;
                                    };
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    } & {
        admin: {
            tenants: {
                ":tenantId": {
                    "event-routing": {};
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        get: {
                            body: unknown;
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        tenantId: string;
                                        routes: {
                                            routeId: string;
                                            event: {
                                                id: string;
                                                name: string;
                                                category: "payment" | "erp" | "lifecycle" | "system" | undefined;
                                                direction: "inbound" | "outbound" | "both" | undefined;
                                            };
                                            actions: ({
                                                readonly id: "generate_irn";
                                                readonly name: "Generate IRN";
                                                readonly order: 1;
                                                readonly category: "outbound";
                                                readonly description: "Generate an Invoice Reference Number (IRN) for the invoice.";
                                                readonly endpoint: "POST /api/v1/workflow/irn/generate";
                                            } | {
                                                readonly id: "transform";
                                                readonly name: "Transform";
                                                readonly order: 2;
                                                readonly category: "outbound";
                                                readonly description: "Transform the ERP invoice payload into FIRS UBL format.";
                                                readonly endpoint: "POST /api/v1/workflow/transform";
                                            } | {
                                                readonly id: "validate";
                                                readonly name: "Validate";
                                                readonly order: 3;
                                                readonly category: "outbound";
                                                readonly description: "Validate the transformed invoice against FIRS schema and business rules.";
                                                readonly endpoint: "POST /api/v1/workflow/validate";
                                            } | {
                                                readonly id: "sign";
                                                readonly name: "Sign";
                                                readonly order: 4;
                                                readonly category: "outbound";
                                                readonly description: "Digitally sign the validated invoice using tenant FIRS credentials.";
                                                readonly endpoint: "POST /api/v1/workflow/sign";
                                            } | {
                                                readonly id: "transmit";
                                                readonly name: "Transmit";
                                                readonly order: 5;
                                                readonly category: "outbound";
                                                readonly description: "Transmit the signed invoice to the FIRS API.";
                                                readonly endpoint: "POST /api/v1/workflow/transmit";
                                            } | {
                                                readonly id: "complete_outbound";
                                                readonly name: "Complete Outbound Flow";
                                                readonly order: 6;
                                                readonly category: "outbound";
                                                readonly description: "Execute the full outbound pipeline: Transform → Validate → Sign → Transmit in one call.";
                                                readonly endpoint: "POST /api/v1/workflow/outbound";
                                            } | {
                                                readonly id: "complete_inbound";
                                                readonly name: "Complete Inbound Flow";
                                                readonly order: 7;
                                                readonly category: "inbound";
                                                readonly description: "Execute the full inbound pipeline: receive, validate, and acknowledge an inbound invoice.";
                                                readonly endpoint: "POST /api/v1/workflow/inbound";
                                            } | {
                                                readonly id: "report_vat";
                                                readonly name: "Report VAT";
                                                readonly order: 8;
                                                readonly category: "reporting";
                                                readonly description: "Submit VAT report for the invoice or reporting period to FIRS.";
                                                readonly endpoint: "POST /api/v1/workflow/vat-report";
                                            } | {
                                                readonly id: "confirm_invoice_status";
                                                readonly name: "Confirm Invoice Status";
                                                readonly order: 9;
                                                readonly category: "reporting";
                                                readonly description: "Query FIRS to confirm the current status of a transmitted invoice.";
                                                readonly endpoint: "GET /api/v1/workflow/status/:irn";
                                            } | {
                                                readonly id: "update_payment_status";
                                                readonly name: "Update Payment Status";
                                                readonly order: 10;
                                                readonly category: "reporting";
                                                readonly description: "Submit VAT post-payment report to FIRS after payment is recorded on a DELIVERED invoice.";
                                                readonly endpoint: "PATCH /api/v1/workflow/invoices/outbound/:irn/payment-status";
                                            } | {
                                                readonly id: "sync_erp";
                                                readonly name: "Sync to ERP";
                                                readonly order: 11;
                                                readonly category: "outbound";
                                                readonly description: "Push processed invoice data back to the tenant ERP using the configured sync endpoint and Handlebars body template.";
                                                readonly endpoint: "POST /api/v1/workflow/erp-sync";
                                            } | {
                                                id: string;
                                                name: string;
                                            })[];
                                            enabled: boolean;
                                            description: string | null;
                                        }[];
                                        total: number;
                                    };
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        routes: {
                            post: {
                                body: {
                                    description?: string | undefined;
                                    enabled?: boolean | undefined;
                                    event: string;
                                    actions: string[];
                                };
                                params: {
                                    tenantId: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        error: string;
                                        message?: undefined;
                                        data?: undefined;
                                    } | {
                                        success: boolean;
                                        message: string;
                                        data: import("./v1/admin").IEventRoute;
                                        error?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        routes: {
                            ":routeId": {
                                patch: {
                                    body: {
                                        description?: string | undefined;
                                        enabled?: boolean | undefined;
                                        event?: string | undefined;
                                        actions?: string[] | undefined;
                                    };
                                    params: {
                                        tenantId: string;
                                        routeId: string;
                                    };
                                    query: unknown;
                                    headers: unknown;
                                    response: {
                                        200: {
                                            success: boolean;
                                            error: string;
                                            message?: undefined;
                                            data?: undefined;
                                        } | {
                                            success: boolean;
                                            message: string;
                                            data: import("./v1/admin").IEventRoute | undefined;
                                            error?: undefined;
                                        };
                                        422: {
                                            type: "validation";
                                            on: string;
                                            summary?: string;
                                            message?: string;
                                            found?: unknown;
                                            property?: string;
                                            expected?: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        routes: {
                            ":routeId": {
                                delete: {
                                    body: unknown;
                                    params: {
                                        tenantId: string;
                                        routeId: string;
                                    };
                                    query: unknown;
                                    headers: unknown;
                                    response: {
                                        200: {
                                            success: boolean;
                                            error: string;
                                            message?: undefined;
                                        } | {
                                            success: boolean;
                                            message: string;
                                            error?: undefined;
                                        };
                                        422: {
                                            type: "validation";
                                            on: string;
                                            summary?: string;
                                            message?: string;
                                            found?: unknown;
                                            property?: string;
                                            expected?: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        put: {
                            body: {
                                routes: {
                                    description?: string | undefined;
                                    enabled?: boolean | undefined;
                                    routeId?: string | undefined;
                                    event: string;
                                    actions: string[];
                                }[];
                            };
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    error: string;
                                    message?: undefined;
                                    data?: undefined;
                                } | {
                                    success: boolean;
                                    message: string;
                                    data: {
                                        tenantId: string;
                                        routes: import("./v1/admin").IEventRoute[];
                                        total: number;
                                    };
                                    error?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            tenants: {
                ":tenantId": {
                    "event-routing": {
                        delete: {
                            body: unknown;
                            params: {
                                tenantId: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    message: string;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        invoicing: {};
    } & {
        invoicing: {
            "generate-irn": {
                post: {
                    body: {
                        issueDate?: string | undefined;
                        invoiceNumber: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: {
                                irn: string | undefined;
                                generated: boolean;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            transform: {
                post: {
                    body: any;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            workflowState: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                            workflowState?: undefined;
                        };
                    };
                };
            };
        } & {
            validate: {
                post: {
                    body: any;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: any;
                            valid: any;
                            data: any;
                            errors: any;
                            workflowState: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            valid?: undefined;
                            data?: undefined;
                            errors?: undefined;
                            workflowState?: undefined;
                        };
                    };
                };
            };
        } & {
            sign: {
                post: {
                    body: any;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: any;
                            signed: any;
                            data: any;
                            errors: any;
                            workflowState: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            signed?: undefined;
                            data?: undefined;
                            errors?: undefined;
                            workflowState?: undefined;
                        };
                    };
                };
            };
        } & {
            "generate-qr": {
                post: {
                    body: {
                        irn: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            transmit: {
                post: {
                    body: {
                        irn: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            decrypt: {
                post: {
                    body: {
                        irn: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            acknowledge: {
                post: {
                    body: {
                        message?: string | undefined;
                        irn: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":irn": {
                status: {
                    patch: {
                        body: {
                            rejectionReason?: string | undefined;
                            paymentDate?: string | undefined;
                            paymentAmount?: number | undefined;
                            paymentReference?: string | undefined;
                            status: "PENDING" | "PAID" | "REJECTED";
                        };
                        params: {
                            irn: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: any;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            report: {
                post: {
                    body: {
                        integrator_service_id?: string | undefined;
                        currency: string;
                        irn: string;
                        agent_tin: string;
                        base_amount: string;
                        beneficiary_tin: string;
                        item_description: string;
                        other_taxes: string;
                        total_amount: string;
                        transaction_date: string;
                        vat_calculated: string;
                        vat_rate: string;
                        vat_status: "STANDARD_VAT" | "ZERO_VAT" | "REDUCED_VAT";
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        } & {
            ":irn": {
                confirm: {
                    get: {
                        body: unknown;
                        params: {
                            irn: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: any;
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        workflow: {};
    } & {
        workflow: {
            outbound: {};
        } & {
            outbound: {
                post: {
                    body: {};
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            status: boolean;
                            data: {
                                qrCode: String;
                                data: any;
                            };
                            success?: undefined;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            status?: undefined;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        };
    } & {
        workflow: {
            inbound: {};
        } & {
            inbound: {
                post: {
                    body: any;
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            status: boolean;
                            data: {
                                status: boolean;
                                data: any;
                                error?: undefined;
                            } | {
                                status: boolean;
                                error: string;
                                data: null;
                            };
                            success?: undefined;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            status?: undefined;
                            data?: undefined;
                        };
                    };
                };
            };
        };
    } & {
        workflow: {
            transform: {};
        } & {
            transform: {
                post: {
                    body: {
                        invoice: any;
                        source_type: string;
                    };
                    params: {};
                    query: unknown;
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: any;
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        };
    } & {
        workflow: {
            invoices: {};
        } & {
            invoices: {
                outbound: {
                    get: {
                        body: unknown;
                        params: {};
                        query: {
                            status?: string | undefined;
                            page?: string | undefined;
                            limit?: string | undefined;
                            source?: string | undefined;
                            erpInvoiceId?: string | undefined;
                            from?: string | undefined;
                            to?: string | undefined;
                        };
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    irn: string;
                                    erpInvoiceId: string | undefined;
                                    source: import("./v1/workflow/models").OutboundInvoiceSource;
                                    invoiceNumber: any;
                                    status: import("./v1/workflow/models").OutboundInvoiceStatus;
                                    paymentStatus: import("./v1/workflow/models").OutboundPaymentStatus;
                                    qrCode: String;
                                    erp: string;
                                    workflowState: import("./v1/workflow/models").IWorkflowState;
                                    lastJobError: import("./v1/workflow/models").ILastJobError | undefined;
                                    customerName: any;
                                    totalAmount: any;
                                    currency: any;
                                    webhookEventCount: number;
                                    createdAt: Date;
                                    updatedAt: Date;
                                }[];
                                pagination: {
                                    page: number;
                                    limit: number;
                                    total: number;
                                    totalPages: number;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                                pagination?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                outbound: {
                    ":irn": {
                        get: {
                            body: unknown;
                            params: {
                                irn: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        invoice: {
                                            irn: string;
                                            erpInvoiceId: string | undefined;
                                            source: import("./v1/workflow/models").OutboundInvoiceSource;
                                            tenantId: string;
                                            status: import("./v1/workflow/models").OutboundInvoiceStatus;
                                            paymentStatus: import("./v1/workflow/models").OutboundPaymentStatus;
                                            paymentDetails: import("./v1/workflow/models").IOutboundPaymentDetails | undefined;
                                            workflowState: import("./v1/workflow/models").IWorkflowState;
                                            lastJobError: import("./v1/workflow/models").ILastJobError | undefined;
                                            qrCode: String;
                                            erpSystem: string;
                                            validationAttempts: number;
                                            validationErrors: import("./v1/workflow/models").IValidationError[] | undefined;
                                            metadata: Record<string, any>;
                                            createdAt: Date;
                                            updatedAt: Date;
                                        };
                                        webhookEvents: {
                                            eventId: any;
                                            eventType: any;
                                            status: any;
                                            payload: any;
                                            jobErrors: any;
                                            jobSteps: ({
                                                agendaJobId: string;
                                                jobName: any;
                                                action: any;
                                                stepIndex: any;
                                                jobChainId: any;
                                                status: any;
                                                scheduledAt: any;
                                                startedAt: any;
                                                finishedAt: any;
                                                failedAt: any;
                                                failReason: any;
                                                output: any;
                                            } | null)[];
                                            routing: any;
                                            receivedAt: any;
                                            deliveredAt: any;
                                            failedAt: any;
                                            failureReason: any;
                                        }[];
                                        statusHistory: any[];
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                outbound: {
                    ":irn": {
                        "payment-status": {
                            patch: {
                                body: {
                                    paymentDetails?: {
                                        paymentDate?: string | undefined;
                                        paymentMethod?: string | undefined;
                                        transactionReference?: string | undefined;
                                        amountPaid?: number | undefined;
                                    } | undefined;
                                    paymentStatus: "PAID" | "PARTIAL" | "OVERDUE";
                                };
                                params: {
                                    irn: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        message: string;
                                        data: {
                                            irn: string;
                                            paymentStatus: import("./v1/workflow/models").OutboundPaymentStatus;
                                            paymentDetails: import("./v1/workflow/models").IOutboundPaymentDetails | undefined;
                                            vatReportScheduled: boolean;
                                            jobChainId: string | null;
                                        };
                                        error?: undefined;
                                        statusCode?: undefined;
                                    } | {
                                        success: boolean;
                                        error: any;
                                        statusCode: any;
                                        message?: undefined;
                                        data?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                outbound: {
                    ":irn": {
                        "retry-from-step": {
                            post: {
                                body: {
                                    fromStep: string;
                                };
                                params: {
                                    irn: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        message: string;
                                        data: {
                                            irn: string;
                                            fromStep: string;
                                            actions: string[];
                                            jobChainId: string;
                                        };
                                        error?: undefined;
                                        statusCode?: undefined;
                                    } | {
                                        success: boolean;
                                        error: any;
                                        statusCode: any;
                                        message?: undefined;
                                        data?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                outbound: {
                    ":irn": {
                        resend: {
                            post: {
                                body: unknown;
                                params: {
                                    irn: string;
                                };
                                query: unknown;
                                headers: unknown;
                                response: {
                                    200: {
                                        success: boolean;
                                        message: string;
                                        data: {
                                            irn: string;
                                            restartedFrom: string;
                                            result: {
                                                qrCode: String;
                                                data: any;
                                            };
                                        };
                                        error?: undefined;
                                        statusCode?: undefined;
                                    } | {
                                        success: boolean;
                                        error: any;
                                        statusCode: any;
                                        message?: undefined;
                                        data?: undefined;
                                    };
                                    422: {
                                        type: "validation";
                                        on: string;
                                        summary?: string;
                                        message?: string;
                                        found?: unknown;
                                        property?: string;
                                        expected?: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                inbound: {
                    get: {
                        body: unknown;
                        params: {};
                        query: {
                            status?: string | undefined;
                            page?: string | undefined;
                            limit?: string | undefined;
                            from?: string | undefined;
                            to?: string | undefined;
                            paymentStatus?: string | undefined;
                        };
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    irn: string;
                                    invoiceNumber: string;
                                    supplierName: string;
                                    supplierTIN: string;
                                    status: import("./v1/workflow/models").InboundInvoiceStatus;
                                    paymentStatus: import("./v1/workflow/models").PaymentStatus | undefined;
                                    totalAmount: number;
                                    currency: string;
                                    issueDate: Date;
                                    dueDate: Date;
                                    receivedAt: Date;
                                }[];
                                pagination: {
                                    page: number;
                                    limit: number;
                                    total: number;
                                    totalPages: number;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                                pagination?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        } & {
            invoices: {
                inbound: {
                    ":irn": {
                        get: {
                            body: unknown;
                            params: {
                                irn: string;
                            };
                            query: unknown;
                            headers: unknown;
                            response: {
                                200: {
                                    success: boolean;
                                    data: {
                                        invoice: {
                                            irn: string;
                                            invoiceNumber: string;
                                            tenantId: string;
                                            businessId: string;
                                            status: import("./v1/workflow/models").InboundInvoiceStatus;
                                            paymentStatus: import("./v1/workflow/models").PaymentStatus | undefined;
                                            supplierTIN: string;
                                            supplierName: string;
                                            supplierAddress: string | undefined;
                                            totalAmount: number;
                                            currency: string;
                                            issueDate: Date;
                                            dueDate: Date;
                                            decryptedData: any;
                                            workflowState: import("./v1/workflow/models").IInboundWorkflowState;
                                            paymentDetails: import("./v1/workflow/models").IPaymentDetails | undefined;
                                            metadata: Record<string, any>;
                                            createdAt: Date;
                                            updatedAt: Date;
                                        };
                                        statusHistory: {
                                            status: any;
                                            timestamp: any;
                                            details: any;
                                        }[];
                                    };
                                    error?: undefined;
                                    statusCode?: undefined;
                                } | {
                                    success: boolean;
                                    error: any;
                                    statusCode: any;
                                    data?: undefined;
                                };
                                422: {
                                    type: "validation";
                                    on: string;
                                    summary?: string;
                                    message?: string;
                                    found?: unknown;
                                    property?: string;
                                    expected?: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        webhook: {};
    } & {
        webhook: {
            listen: {
                ":webhookPath": {
                    [x: string]: {
                        body: unknown;
                        params: {
                            webhookPath: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: AsyncGenerator<{
                                readonly event: "connected";
                                readonly data: {
                                    readonly tenantId: string;
                                    readonly webhookPath: string;
                                    readonly connectedAt: string;
                                    readonly message: "Listening for inbound webhook events";
                                };
                            } | {
                                readonly id: any;
                                readonly event: any;
                                readonly data: any;
                            }, {} | undefined, unknown>;
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    } & {
        webhook: {
            inbound: {
                ":webhookPath": {
                    post: {
                        body: unknown;
                        params: {
                            webhookPath: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                error: string;
                                message?: undefined;
                                data?: undefined;
                            } | {
                                success: boolean;
                                message: string;
                                data: {
                                    eventId: string;
                                    tenantId: string;
                                    eventType: string;
                                    status: import("./v1/webhook/models").WebhookDeliveryStatus.PENDING | import("./v1/webhook/models").WebhookDeliveryStatus.DELIVERED | import("./v1/webhook/models").WebhookDeliveryStatus.RETRY;
                                    receivedAt: string;
                                    idempotent: boolean;
                                    irn?: undefined;
                                    erpInvoiceId?: undefined;
                                    routing?: undefined;
                                };
                                error?: undefined;
                            } | {
                                success: boolean;
                                message: string;
                                data: {
                                    eventId: string;
                                    tenantId: string;
                                    eventType: any;
                                    irn: string | undefined;
                                    erpInvoiceId: string;
                                    receivedAt: string;
                                    routing: {
                                        matchedRoutes: number;
                                        actions: string[];
                                        jobChainId: string | null;
                                    };
                                    status?: undefined;
                                    idempotent?: undefined;
                                };
                                error?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    v1: {
        webhook: {
            events: {};
        };
    } & {
        webhook: {
            events: {
                get: {
                    body: unknown;
                    params: {};
                    query: {
                        status?: string | undefined;
                        tenantId?: string | undefined;
                        page?: string | undefined;
                        limit?: string | undefined;
                        irn?: string | undefined;
                        from?: string | undefined;
                        to?: string | undefined;
                        eventType?: string | undefined;
                    };
                    headers: unknown;
                    response: {
                        200: {
                            success: boolean;
                            data: {
                                eventId: string;
                                tenantId: string;
                                eventType: string;
                                status: import("./v1/webhook/models").WebhookDeliveryStatus;
                                resourceId: string;
                                resourceType: string;
                                irn: any;
                                erpInvoiceId: any;
                                jobErrorCount: number;
                                createdAt: Date;
                                updatedAt: Date;
                            }[];
                            meta: {
                                total: number;
                                page: number;
                                limit: number;
                                pages: number;
                            };
                            error?: undefined;
                            statusCode?: undefined;
                        } | {
                            success: boolean;
                            error: any;
                            statusCode: any;
                            data?: undefined;
                            meta?: undefined;
                        };
                        422: {
                            type: "validation";
                            on: string;
                            summary?: string;
                            message?: string;
                            found?: unknown;
                            property?: string;
                            expected?: string;
                        };
                    };
                };
            };
        };
    } & {
        webhook: {
            events: {
                ":eventId": {
                    get: {
                        body: unknown;
                        params: {
                            eventId: string;
                        };
                        query: unknown;
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    eventId: string;
                                    tenantId: string;
                                    eventType: string;
                                    status: import("./v1/webhook/models").WebhookDeliveryStatus;
                                    resourceId: string;
                                    resourceType: string;
                                    webhookUrl: string;
                                    payload: any;
                                    metadata: Record<string, any>;
                                    irn: any;
                                    erpInvoiceId: any;
                                    jobErrors: import("./v1/webhook/models").IJobError[];
                                    deliveryAttempts: import("./v1/webhook/models").IWebhookDeliveryAttempt[];
                                    maxRetries: number;
                                    failureReason: string | undefined;
                                    deliveredAt: Date | undefined;
                                    failedAt: Date | undefined;
                                    nextRetryAt: Date | undefined;
                                    createdAt: Date;
                                    updatedAt: Date;
                                };
                                error?: undefined;
                                statusCode?: undefined;
                            } | {
                                success: boolean;
                                error: any;
                                statusCode: any;
                                data?: undefined;
                            };
                            422: {
                                type: "validation";
                                on: string;
                                summary?: string;
                                message?: string;
                                found?: unknown;
                                property?: string;
                                expected?: string;
                            };
                        };
                    };
                };
            };
        };
    };
} & {
    get: {
        body: unknown;
        params: {};
        query: unknown;
        headers: unknown;
        response: {
            200: {
                success: boolean;
                message: string;
                version: string;
                apiVersion: string | undefined;
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {
        200: {
            success: boolean;
            error: string;
            statusCode: number;
            details: {
                on: any;
                message: string;
                fields: Record<string, string>;
            };
            message?: undefined;
        } | {
            success: boolean;
            error: string;
            statusCode: number;
            message: any;
            details?: undefined;
        } | {
            success: boolean;
            error: any;
            statusCode: number | "Continue" | "Switching Protocols" | "Processing" | "Early Hints" | "OK" | "Created" | "Accepted" | "Non-Authoritative Information" | "No Content" | "Reset Content" | "Partial Content" | "Multi-Status" | "Already Reported" | "Multiple Choices" | "Moved Permanently" | "Found" | "See Other" | "Not Modified" | "Temporary Redirect" | "Permanent Redirect" | "Bad Request" | "Unauthorized" | "Payment Required" | "Forbidden" | "Not Found" | "Method Not Allowed" | "Not Acceptable" | "Proxy Authentication Required" | "Request Timeout" | "Conflict" | "Gone" | "Length Required" | "Precondition Failed" | "Payload Too Large" | "URI Too Long" | "Unsupported Media Type" | "Range Not Satisfiable" | "Expectation Failed" | "I'm a teapot" | "Enhance Your Calm" | "Misdirected Request" | "Unprocessable Content" | "Locked" | "Failed Dependency" | "Too Early" | "Upgrade Required" | "Precondition Required" | "Too Many Requests" | "Request Header Fields Too Large" | "Unavailable For Legal Reasons" | "Internal Server Error" | "Not Implemented" | "Bad Gateway" | "Service Unavailable" | "Gateway Timeout" | "HTTP Version Not Supported" | "Variant Also Negotiates" | "Insufficient Storage" | "Loop Detected" | "Not Extended" | "Network Authentication Required";
            details?: undefined;
            message?: undefined;
        };
    };
}>;
export type App = typeof app;
export default app;
