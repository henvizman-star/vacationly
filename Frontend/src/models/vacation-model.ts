export type VacationFilter = "all" | "liked" | "active" | "upcoming";
export type VacationInput = {
    destination: string;
    country: string;
    continent: string;
    description: string;
    startDate: string;
    endDate: string;
    price: number;
};
// Vacation data returned by the API, including like state for this user.
export type VacationModel = {
    id: number;
    destination: string;
    country: string;
    continent: string;
    description: string;
    startDate: string;
    endDate: string;
    price: number;
    imageName: string;
    imageUrl: string;
    likesCount: number;
    isLiked: boolean;
};
// Page results and metadata used to render navigation.
export type VacationPage = {
    vacations: VacationModel[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};
