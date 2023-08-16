import React, {Component} from 'react'
import axios from 'axios';

const TITLE = 'GraphQL Github Client'

const axiosGithubGraphQL = axios.create({
	baseURL: 'https://api.github.com/graphql',
	headers: {
		Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
	}
})

const GET_ISSUES_OF_REPOSITORY = `
	query($organization: String!, $repository: String!, $cursor: String){
		organization(login: $organization){
			name
			url
			repository(name: $repository){
				id
				name
				url
				stargazers {
					totalCount
				}
				viewerHasStarred
				issues(last: 5, after: $cursor, states: [OPEN]){
					edges{
						node{
							id
							title
							url
							reactions(last: 3){
								edges {
									node {
										id
										content
									}
								}
							}
						}
					}
					totalCount
					pageInfo {
						endCursor
						hasNextPage
					}
				}
			}
		}
	}
`; 

const ADD_STAR = `
	mutation ($repositoryId: ID!){
		addStar(input: {starrableId:$repositoryId}){
			starrable {
				viewerHasStarred
			}
		}
	}
`;

const REMOVER_STAR = `
	mutation ($repositoryId: ID!) {
		removeStar(input:{starrableId: $repositoryId}) {
			starrable {
				viewerHasStarred
			}
		}
	}
`;

const getIssuesOfRepository = (path, cursor) => {
	const [organization, repository] = path.split('/')

	return axiosGithubGraphQL.post('', {
		query: GET_ISSUES_OF_REPOSITORY,
		variables: {organization, repository, cursor},
	})
}

const addStarToRepository = repositoryId => {
	return axiosGithubGraphQL.post('', {
		query: ADD_STAR,
		variables: {repositoryId}
	})
}

const resolveIssuesQuery = (queryResult, cursor) => state => {
	const {data, errors} = queryResult.data	
	if(!cursor){
		return {
			organization: data.organization,
			errors
		};
	}
	const {edges: oldIssues} = state.organization.repository.issues;
	const {edges: newIssues} = data.organization.repository.issues;
	const updatedIssues = [...oldIssues, ...newIssues]

	return {
		organization: {
			...data.organization,
			repository: {
				...data.organization.repository,
				issues: {
					...data.organization.repository.issues,
					edges: updatedIssues
				},
			},
		},
		errors
	};
};

const resolveAddStarMutation = mutationResult => state => {
	const {viewerHasStarred} = mutationResult.data.data.addStar.starrable
	const {totalCount} = state.organization.repository.stargazers

	return {
		...state,
		organization: {
			...state.organization,
			repository: {
				...state.organization.repository,
				viewerHasStarred,
				stargazers: {
					totalCount: totalCount + 1,
				}
			}
		}
	}
}

const removeStarFromRepository = repositoryId => {
	return axiosGithubGraphQL.post('', {
		query: REMOVER_STAR,
		variables: {repositoryId}
	})
}

const resolveRemoveStarMutation = mutationResult => state => {
	const {viewerHasStarred} = mutationResult.data.data.removeStar.starrable
	const {totalCount} = state.organization.repository.stargazers

	return {
		...state,
		organization: {
			...state.organization,
			repository: {
				...state.organization.repository,
				viewerHasStarred,
				stargazers: {
					totalCount: totalCount - 1,
				}
			}
		}
	}
}

class App extends Component {
	state = {
		path: 'the-road-to-learn-react/the-road-to-learn-react',
		organization: null,
		errors: null,
	};

	componentDidMount() {
		this.onFetchFromGithub(this.state.path);
	}

	onChange = event => {
		this.setState({path: event.target.value })
	}

	onSubmit = event => {
		this.onFetchFromGithub(this.state.path)
		event.preventDefault()
	}

	onFetchFromGithub = (path, cursor) => {
		getIssuesOfRepository(path, cursor).then(queryResult => 
			this.setState(resolveIssuesQuery(queryResult, cursor))
		)
	}

	onFetchMoreIssues = () => {
		const {endCursor} = this.state.organization.repository.issues.pageInfo
		this.onFetchFromGithub(this.state.path, endCursor)
	}

	onStarRepository = (repositoryId, viewerHasStarred) => {
		if(viewerHasStarred){
			removeStarFromRepository(repositoryId).then(mutationResult => 
				this.setState(resolveRemoveStarMutation(mutationResult))
			)
		}else{
			addStarToRepository(repositoryId).then(mutationResult => 
				this.setState(resolveAddStarMutation(mutationResult))
			)
		}
	}

	render() {
		const {path, organization, errors} = this.state
		return (
			<div>
				<h1>{TITLE}</h1>
				<form onSubmit={this.onSubmit}>
					<label htmlFor='url'>
						Show open issues for https://github.com/
					</label>
					<input 
						id="url" 
						type="text" 
						value={path}
						onChange={this.onChange} 
						style={{width: '300px'}} 
					/>
					<button type='submit'>Search</button>
				</form>
				<hr/>
				{organization 
				? (
					<Organization 
						organization={organization} 
						errors={errors} 
						onFetchMoreIssues={this.onFetchMoreIssues}
						onStarRepository={this.onStarRepository}
					/>
				) : (
					<p>No Information yet ...</p>
				)}
			</div>
		);
	}
}

const Organization = ({
	organization, 
	errors, 
	onFetchMoreIssues,
	onStarRepository
}) => {
	if(errors){
		return(
			<p>
				<strong>Oops! Something Went Wrong</strong>
				{errors.map(error => error.message)}
			</p>
		)
	}
	return (
		<div>
			<p>
				<strong>Issues from Organization:&nbsp;</strong>
				<a href={organization.url}>{organization.name}</a>
			</p>
			<Repository 
				repository={organization.repository} 
				onFetchMoreIssues={onFetchMoreIssues}
				onStarRepository={onStarRepository} />
		</div>
	)
}

const Repository = ({repository, onFetchMoreIssues, onStarRepository}) => (
	<div>
		<p>
			<strong>In Repository:&nbsp;</strong>
			<a href={repository.url}>{repository.name}</a>
		</p>
		<button
			type='button'
			onClick={() => onStarRepository(repository.id, repository.viewerHasStarred)}>
			{repository.stargazers.totalCount}
			{repository.viewerHasStarred ?  ' Unstar' : ' Star'}
		</button>
		<IssueList issue_list={repository} />
		<hr/>
		{repository.issues.pageInfo.hasNextPage && (
			<button onClick={onFetchMoreIssues}>More...</button>
		)}
		
	</div>
)


const IssueList = ({issue_list}) => (
	<ul>
		{issue_list.issues.edges.map(issue => (
			<IssueItem 
				key={issue.node.id}
				issue_item={issue} />
		))}
	</ul>
)

const IssueItem = ({issue_item}) => (
	<li>
		<a href={issue_item.node.url}>{issue_item.node.title}</a>
		<ReactionList reaction_list={issue_item} />
	</li>
)

const ReactionList = ({reaction_list}) => (
	<ul>
		{reaction_list.node.reactions.edges.map(reaction => (
			<ReactionItem key={reaction_list.node.id} reaction_item={reaction} />
		))}
	</ul>
)

const ReactionItem = ({reaction_item}) => (
	<li>{reaction_item.node.content}</li>
)

export default App;