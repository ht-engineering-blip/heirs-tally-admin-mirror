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
                    erpSystem: import("./v1/workflow/models").SchemaSourceType;
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
                        erpSystem?: import("./v1/workflow/models").SchemaSourceType | undefined;
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
                                    data: {
                                        webhookUrl: string;
                                        webhookSecret: string;
                                        webhookPath: string;
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
                            role: "admin" | "member" | "viewer";
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
                                role?: "admin" | "member" | "viewer" | undefined;
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
                                        erpSystem: import("./v1/workflow/models").SchemaSourceType | undefined;
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
                                qrCode: string;
                                data: string;
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
                    body: {};
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
            transform: {};
        } & {
            transform: {
                post: {
                    body: {
                        source_type?: import("./v1/workflow/models").SchemaSourceType | undefined;
                        invoice: any;
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
                            from?: string | undefined;
                            to?: string | undefined;
                        };
                        headers: unknown;
                        response: {
                            200: {
                                success: boolean;
                                data: {
                                    irn: string;
                                    invoiceNumber: any;
                                    status: import("./v1/workflow/models").OutboundInvoiceStatus;
                                    qrCode: String;
                                    erp: import("./v1/workflow/models").SchemaSourceType;
                                    workflowState: import("./v1/workflow/models").IWorkflowState;
                                    customerName: any;
                                    totalAmount: any;
                                    currency: any;
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
                                            tenantId: string;
                                            status: import("./v1/workflow/models").OutboundInvoiceStatus;
                                            workflowState: import("./v1/workflow/models").IWorkflowState;
                                            qrCode: String;
                                            invoiceData: Record<string, any>;
                                            validationAttempts: number;
                                            validationErrors: import("./v1/workflow/models").IValidationError[] | undefined;
                                            metadata: Record<string, any>;
                                            createdAt: Date;
                                            updatedAt: Date;
                                        };
                                        statusHistory: {
                                            status: any;
                                            timestamp: any;
                                            details: any;
                                        }[];
                                        webhookEvents: import("./v1/webhook/models").WebhookEventDocument[];
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
                                                qrCode: string;
                                                data: string;
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
                    get: {
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
                            }, void, unknown>;
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
                                    eventType: any;
                                    receivedAt: string;
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